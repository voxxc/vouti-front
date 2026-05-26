import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TRACKING_URL = 'https://tracking.prod.judit.io/tracking';

interface Body {
  tenantId: string;
  customerKey?: string;
  cnjPattern?: string;
  oabIds?: string[];
  batchSize?: number;
  dryRun?: boolean;
  countOnly?: boolean;
  listOabs?: boolean;
  history?: boolean;
  historyLimit?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const { tenantId, customerKey, cnjPattern, oabIds } = body;
    const batchSize = Math.min(body.batchSize ?? 10, 50);
    const dryRun = !!body.dryRun;
    const countOnly = !!body.countOnly;
    const listOabs = !!body.listOabs;
    const history = !!body.history;

    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenantId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl0 = Deno.env.get('SUPABASE_URL')!;
    const serviceKey0 = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb0 = createClient(supabaseUrl0, serviceKey0);

    // Modo: lista OABs do tenant (usado pelo painel de super-admin)
    if (listOabs) {
      const { data, error } = await sb0
        .from('oabs_cadastradas')
        .select('id, nome_advogado, oab_numero, oab_uf')
        .eq('tenant_id', tenantId)
        .order('nome_advogado');
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, oabs: data ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Modo: histórico de migrações desta credencial
    if (history) {
      const limit = Math.min(body.historyLimit ?? 500, 2000);
      let q = sb0
        .from('judit_migracao_attachments')
        .select('numero_cnj, tracking_id_antigo, tracking_id_novo, status, antigo_pausado, customer_key, erro, created_at')
        .eq('tenant_id', tenantId)
        .eq('motivo', 'rebind_credencial')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (customerKey) q = q.eq('customer_key', customerKey);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, history: data ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!tenantId || !customerKey || !cnjPattern || !Array.isArray(oabIds) || oabIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenantId, customerKey, cnjPattern e oabIds são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const webhookOAB = `${supabaseUrl}/functions/v1/judit-webhook-oab`;

    // Pega todas as linhas elegíveis (dentro dos oabIds informados)
    const { data: linhasElegiveis, error: errLin } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, tracking_id, oab_id')
      .eq('tenant_id', tenantId)
      .eq('monitoramento_ativo', true)
      .not('tracking_id', 'is', null)
      .ilike('numero_cnj', cnjPattern)
      .in('oab_id', oabIds);
    if (errLin) throw errLin;

    // Agrupa por numero_cnj
    const mapaCnj = new Map<string, { tracking_id: string; rowIds: string[] }>();
    for (const l of linhasElegiveis || []) {
      if (!l.numero_cnj || !l.tracking_id) continue;
      const cur = mapaCnj.get(l.numero_cnj);
      if (cur) {
        cur.rowIds.push(l.id);
      } else {
        mapaCnj.set(l.numero_cnj, { tracking_id: l.tracking_id, rowIds: [l.id] });
      }
    }

    // Já migrados anteriormente para a mesma customer_key (motivo='rebind_credencial')
    const { data: jaMigrados } = await supabase
      .from('judit_migracao_attachments')
      .select('numero_cnj')
      .eq('tenant_id', tenantId)
      .eq('motivo', 'rebind_credencial')
      .eq('customer_key', customerKey)
      .eq('status', 'migrado');
    const setJa = new Set((jaMigrados || []).map((r: any) => r.numero_cnj));

    const cnjsPendentes = [...mapaCnj.keys()].filter((c) => !setJa.has(c));

    // Para cada CNJ pendente, verificar se há outras linhas fora dos oabIds (compartilhado)
    const compartilhamentoMap = new Map<string, boolean>();
    if (cnjsPendentes.length > 0) {
      const { data: todasLinhas } = await supabase
        .from('processos_oab')
        .select('numero_cnj, oab_id, monitoramento_ativo')
        .eq('tenant_id', tenantId)
        .in('numero_cnj', cnjsPendentes);
      const setOabFiltro = new Set(oabIds);
      for (const cnj of cnjsPendentes) {
        const linhas = (todasLinhas || []).filter((r: any) => r.numero_cnj === cnj);
        const compartilhado = linhas.some((r: any) => !setOabFiltro.has(r.oab_id));
        compartilhamentoMap.set(cnj, compartilhado);
      }
    }

    if (countOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          cnjs_elegiveis: cnjsPendentes.length,
          cnjs_total_filtro: mapaCnj.size,
          linhas_filtro: (linhasElegiveis || []).length,
          ja_migrados: setJa.size,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const lote = cnjsPendentes.slice(0, batchSize);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          lote: lote.map((cnj) => ({
            numero_cnj: cnj,
            tracking_antigo: mapaCnj.get(cnj)?.tracking_id,
            linhas_afetadas: mapaCnj.get(cnj)?.rowIds.length,
            compartilhado_fora_filtro: compartilhamentoMap.get(cnj) ?? false,
            antigo_sera_pausado: !(compartilhamentoMap.get(cnj) ?? false),
          })),
          restantes: Math.max(0, cnjsPendentes.length - lote.length),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let migrados = 0;
    let erros = 0;
    const results: any[] = [];

    for (const cnj of lote) {
      const info = mapaCnj.get(cnj)!;
      const compartilhado = compartilhamentoMap.get(cnj) ?? false;
      try {
        const numeroLimpo = cnj.replace(/\D/g, '');
        const payload: any = {
          recurrence: 1,
          search: { search_type: 'lawsuit_cnj', search_key: numeroLimpo },
          callback_url: webhookOAB,
          with_attachments: true,
          credential: { customer_key: customerKey },
        };

        const createRes = await fetch(TRACKING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
          body: JSON.stringify(payload),
        });
        const createTxt = await createRes.text();
        if (!createRes.ok) throw new Error(`CREATE ${createRes.status}: ${createTxt.substring(0, 200)}`);
        const novoTrackingId = JSON.parse(createTxt).tracking_id;
        if (!novoTrackingId) throw new Error('CREATE sem tracking_id');

        // Pausa antigo somente se NÃO for compartilhado fora do filtro
        let antigoPausado: boolean | null = null;
        let pausaErro: string | null = null;
        if (!compartilhado && info.tracking_id) {
          try {
            const pauseRes = await fetch(`${TRACKING_URL}/${info.tracking_id}/pause`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
            });
            antigoPausado = pauseRes.ok;
            await pauseRes.text().catch(() => {});
            if (!pauseRes.ok) pausaErro = `${pauseRes.status}`;
          } catch (e: any) {
            antigoPausado = false;
            pausaErro = e?.message ?? String(e);
          }
        }

        // Atualiza apenas as linhas das oabIds informadas
        await supabase
          .from('processos_oab')
          .update({
            tracking_id: novoTrackingId,
            with_attachments: true,
            judit_customer_key: customerKey,
            updated_at: new Date().toISOString(),
          })
          .in('id', info.rowIds);

        await supabase.from('judit_migracao_attachments').insert({
          tenant_id: tenantId,
          processo_id: info.rowIds[0],
          tipo: 'oab',
          numero_cnj: cnj,
          tracking_id_antigo: info.tracking_id,
          tracking_id_novo: novoTrackingId,
          status: 'migrado',
          antigo_pausado: antigoPausado,
          pausa_erro: pausaErro,
          customer_key: customerKey,
          motivo: 'rebind_credencial',
        });

        await supabase.from('judit_api_logs').insert({
          tenant_id: tenantId,
          tipo_chamada: 'rebind_credencial',
          endpoint: TRACKING_URL,
          metodo: 'POST',
          request_payload: payload,
          request_id: novoTrackingId,
          sucesso: true,
          resposta_status: createRes.status,
        });

        migrados++;
        results.push({ numero_cnj: cnj, novoTrackingId, antigoPausado, compartilhado, status: 'migrado' });
      } catch (e: any) {
        erros++;
        const msg = e?.message ?? String(e);
        await supabase.from('judit_migracao_attachments').insert({
          tenant_id: tenantId,
          processo_id: info.rowIds[0],
          tipo: 'oab',
          numero_cnj: cnj,
          tracking_id_antigo: info.tracking_id,
          status: 'erro',
          erro: msg,
          customer_key: customerKey,
          motivo: 'rebind_credencial',
        });
        results.push({ numero_cnj: cnj, status: 'erro', erro: msg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processados: lote.length,
        migrados,
        erros,
        restantes: Math.max(0, cnjsPendentes.length - lote.length),
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});