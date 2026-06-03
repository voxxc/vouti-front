import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACKING_API_URL = 'https://tracking.prod.judit.io';
const REQUESTS_API_URL = 'https://requests.prod.judit.io';

const normalizeTimestamp = (ts: string | Date | null): string => {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return String(ts).substring(0, 16);
    return date.toISOString().substring(0, 16);
  } catch {
    return String(ts).substring(0, 16);
  }
};

const generateAndamentoKey = (data: string | null, descricao: string | null): string => {
  const d = normalizeTimestamp(data);
  const desc = (descricao || '').substring(0, 100).toLowerCase().trim();
  return `${d}_${desc}`;
};

function tribunalSiglaFromCnj(numeroCnj: string): string {
  const match = numeroCnj.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!match) return '';
  const segmento = match[1];
  const codigo = match[2];
  if (segmento === '8') {
    const map: Record<string, string> = {
      '16': 'TJPR', '26': 'TJSP', '19': 'TJRJ', '13': 'TJMG', '21': 'TJRS',
      '24': 'TJSC', '05': 'TJBA', '06': 'TJCE', '17': 'TJPE', '09': 'TJGO',
      '07': 'TJDF', '08': 'TJES', '14': 'TJPA', '10': 'TJMA', '25': 'TJSE',
      '15': 'TJPB', '20': 'TJRN', '04': 'TJAM', '12': 'TJMS', '11': 'TJMT',
      '18': 'TJPI', '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '22': 'TJRO',
      '23': 'TJRR', '27': 'TJTO',
    };
    return map[codigo] || '';
  }
  if (segmento === '4') return `TRF${codigo}`;
  if (segmento === '5') return `TRT${codigo}`;
  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      processoOabId,
      userId,
      juditCustomerKey: customerKeyOverride,
      juditSystemName: systemNameOverride,
    } = await req.json();
    if (!processoOabId) throw new Error('processoOabId obrigatorio');

    console.log('[Judit Reset] Iniciando reset para processo:', processoOabId);

    // 1. Buscar processo
    const { data: processo, error: procError } = await supabase
      .from('processos_oab')
      .select('id, tenant_id, oab_id, numero_cnj, tracking_id, monitoramento_ativo, judit_customer_key, capa_completa')
      .eq('id', processoOabId)
      .single();

    if (procError || !processo) throw new Error('Processo nao encontrado');

    const { tenant_id: tenantId, oab_id: oabId, numero_cnj: numeroCnj } = processo;
    const numeroLimpo = numeroCnj.replace(/\D/g, '');

    // Marcar detalhes_request_data = now() para evitar race com sync
    await supabase
      .from('processos_oab')
      .update({ detalhes_request_data: new Date().toISOString() })
      .eq('id', processoOabId);

    // 2. Definir credencial a ser usada:
    //    - Prioridade 1: credencial explícita escolhida pelo usuário no dialog.
    //    - Prioridade 2: credencial salva no processo (última que funcionou).
    //    - Sem fallback automático: nunca tentar "outra credencial qualquer".
    let customerKey: string | null = customerKeyOverride || (processo as any).judit_customer_key || null;
    let systemNameUsada: string | null = systemNameOverride || null;
    console.log('[Judit Reset] Credencial a usar:', customerKey, '(override:', !!customerKeyOverride, ')');

    // 4. POST novo (forçando on_demand, ignorando cache)
    // Shape confirmado: credential vai dentro de search.search_params.credential
    const requestPayload: Record<string, unknown> = {
      search: {
        search_type: 'lawsuit_cnj',
        search_key: numeroLimpo,
        on_demand: true,
        ...(customerKey ? { search_params: { credential: { customer_key: customerKey } } } : {}),
      },
    };

    const { data: postLog } = await supabase
      .from('judit_api_logs')
      .insert({
        tenant_id: tenantId,
        user_id: userId || null,
        oab_id: oabId,
        tipo_chamada: 'reset_processo_post',
        endpoint: `${REQUESTS_API_URL}/requests`,
        metodo: 'POST',
        request_payload: { ...requestPayload, processo_oab_id: processoOabId },
        sucesso: false,
      })
      .select('id')
      .single();

    let postRes = await fetch(`${REQUESTS_API_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
      body: JSON.stringify(requestPayload),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      if (postLog?.id) {
        await supabase.from('judit_api_logs').update({
          sucesso: false, resposta_status: postRes.status, erro_mensagem: errText,
        }).eq('id', postLog.id);
      }
      throw new Error(`Erro POST Judit: ${postRes.status} ${errText.substring(0, 200)}`);
    }

    const postData = await postRes.json();
    const newRequestId: string = postData.request_id;
    console.log('[Judit Reset] Novo request_id:', newRequestId);

    if (postLog?.id) {
      await supabase.from('judit_api_logs').update({
        sucesso: true, resposta_status: 200, request_id: newRequestId,
      }).eq('id', postLog.id);
    }

    // 5. Polling
    let attempts = 0;
    const maxAttempts = 30;
    let resultData: any = null;
    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `${REQUESTS_API_URL}/responses?request_id=${newRequestId}&page=1&page_size=100`,
        { headers: { 'api-key': juditApiKey.trim(), 'Content-Type': 'application/json' } }
      );
      if (!statusRes.ok) { attempts++; continue; }
      const statusData = await statusRes.json();
      if (statusData.page_data && statusData.page_data.length > 0) {
        resultData = statusData;
        break;
      }
      attempts++;
    }

    if (!resultData) {
      await supabase.from('judit_api_logs').insert({
        tenant_id: tenantId, user_id: userId || null, oab_id: oabId,
        tipo_chamada: 'reset_processo_polling',
        endpoint: `${REQUESTS_API_URL}/responses`,
        metodo: 'GET',
        request_id: newRequestId, sucesso: false,
        erro_mensagem: 'Timeout aguardando resposta',
      });
      throw new Error('Timeout aguardando resposta da Judit');
    }

    // 6. Extrair lawsuit data e steps
    const pageData = resultData.page_data || [];
    let lawsuitData: any = null;
    for (const item of pageData) {
      const respType = item.response_type || item.response_data?.response_type;
      if (respType !== 'summary') {
        lawsuitData = item.response_data || item;
        break;
      }
    }
    if (!lawsuitData && pageData.length > 0) {
      lawsuitData = pageData[0].response_data || pageData[0];
    }
    const responseData = lawsuitData || {};
    let steps: any[] = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
    if (steps.length === 0 && responseData?.last_step) {
      steps = [responseData.last_step];
    }

    // 7. Inserir apenas andamentos novos (por key, sem apagar antigos)
    const { data: existingAndamentos } = await supabase
      .from('processos_oab_andamentos')
      .select('descricao, data_movimentacao')
      .eq('processo_oab_id', processoOabId);

    const existingKeys = new Set(
      (existingAndamentos || []).map((a) => generateAndamentoKey(a.data_movimentacao, a.descricao))
    );

    let andamentosNovos = 0;
    for (const step of steps) {
      const dataMov = step.step_date || step.date || step.data || step.data_movimentacao;
      const descOrig = step.content || step.description || step.descricao || '';
      const tipo = step.step_type || step.type || step.tipo || null;
      const desc = descOrig || tipo || 'Movimentação registrada';
      const key = generateAndamentoKey(dataMov, desc);
      if (existingKeys.has(key)) continue;

      const { error: insErr } = await supabase.from('processos_oab_andamentos').insert({
        processo_oab_id: processoOabId,
        tenant_id: tenantId,
        data_movimentacao: dataMov,
        tipo_movimentacao: tipo,
        descricao: desc,
        dados_completos: step,
        lida: false,
      });
      if (!insErr) {
        andamentosNovos++;
        existingKeys.add(key);
      }
    }

    console.log('[Judit Reset] Andamentos novos inseridos:', andamentosNovos);

    // 8. Atualizar processos_oab (campos só se vierem preenchidos)
    const parties = responseData?.parties || [];
    const secrecyLevel = Number(responseData?.secrecy_level || 0);
    const destravou = parties.length > 0 && secrecyLevel < 5;

    const updateFields: Record<string, unknown> = {
      detalhes_request_id: newRequestId,
      detalhes_request_data: new Date().toISOString(),
      ultima_atualizacao_detalhes: new Date().toISOString(),
      detalhes_completos: responseData,
      detalhes_carregados: true,
      updated_at: new Date().toISOString(),
    };
    if (parties.length > 0) updateFields.partes_completas = parties;
    if (responseData?.amount) updateFields.valor_causa = responseData.amount;
    if (responseData?.distribution_date) updateFields.data_distribuicao = responseData.distribution_date;
    if (responseData?.situation) updateFields.status_processual = responseData.situation;
    if (responseData?.phase) updateFields.fase_processual = responseData.phase;
    if (responseData?.related_links || responseData?.link) {
      updateFields.link_tribunal = responseData.related_links || responseData.link;
    }

    // Se destravou (resposta veio com dados reais), atualizar também cabeçalho
    // e capa para o processo deixar de aparecer como "(Processo em sigilo...)".
    if (destravou) {
      const ativa = parties.find((p: any) => {
        const t = (p?.side || p?.person_type || p?.type || '').toString().toUpperCase();
        return t.includes('ATIVO') || t.includes('AUTOR') || t.includes('REQUERENTE');
      });
      const passiva = parties.find((p: any) => {
        const t = (p?.side || p?.person_type || p?.type || '').toString().toUpperCase();
        return t.includes('PASSIVO') || t.includes('REU') || t.includes('REQUERIDO') || t.includes('RÉU');
      });
      if (ativa?.name) updateFields.parte_ativa = ativa.name;
      if (passiva?.name) updateFields.parte_passiva = passiva.name;
      if (responseData?.tribunal_acronym) updateFields.tribunal_sigla = responseData.tribunal_acronym;
      if (responseData?.tribunal) updateFields.tribunal = String(responseData.tribunal);

      // Mesclar capa: pega a nova resposta como base e remove flag de sigilo
      const novaCapa = { ...(responseData || {}) };
      delete (novaCapa as any).sigilo;
      updateFields.capa_completa = novaCapa;

      // Guardar credencial que destravou para reuso futuro
      if (customerKey) {
        updateFields.judit_customer_key = customerKey;
        if (systemNameUsada) updateFields.judit_system_name = systemNameUsada;
      }
    }

    await supabase.from('processos_oab').update(updateFields).eq('id', processoOabId);

    // 9. Registrar em tenant_banco_ids
    await supabase.from('tenant_banco_ids').insert({
      tenant_id: tenantId,
      tipo: 'request_detalhes',
      referencia_id: processoOabId,
      external_id: newRequestId,
      descricao: `Reset manual - CNJ ${numeroCnj}`,
      metadata: {
        numero_cnj: numeroCnj,
        processo_oab_id: processoOabId,
        request_id: newRequestId,
        post_em: new Date().toISOString(),
        origem: 'reset_manual',
        usuario_id: userId || null,
        andamentos_novos: andamentosNovos,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId: newRequestId,
        andamentosNovos,
        destravou,
        motivo: destravou
          ? 'destravado'
          : (customerKey ? 'credencial_sem_acesso' : 'sem_credencial'),
        secrecyLevel,
        customerKeyUsada: customerKey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Judit Reset] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});