import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACKING_URL = 'https://tracking.prod.judit.io/tracking';
const DEFAULT_BATCH = 25;

interface MigrarBody {
  tenantId?: string | null;
  batchSize?: number;
  tipo?: 'oab' | 'cnpj' | 'all';
  dryRun?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: MigrarBody = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize ?? DEFAULT_BATCH, 100);
    const tipo = body.tipo ?? 'all';
    const dryRun = !!body.dryRun;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const webhookOAB = `${supabaseUrl}/functions/v1/judit-webhook-oab`;
    const webhookCNPJ = `${supabaseUrl}/functions/v1/judit-webhook-cnpj`;

    const results: any[] = [];
    let processados = 0;
    let migrados = 0;
    let erros = 0;

    // ---- OAB ----
    if (tipo === 'oab' || tipo === 'all') {
      let q = supabase
        .from('processos_oab')
        .select('id, tenant_id, numero_cnj, tracking_id, oab_id')
        .eq('monitoramento_ativo', true)
        .eq('with_attachments', false)
        .not('tracking_id', 'is', null)
        .limit(batchSize);
      if (body.tenantId) q = q.eq('tenant_id', body.tenantId);

      const { data: processos, error } = await q;
      if (error) throw error;

      for (const p of processos || []) {
        processados++;
        if (dryRun) {
          results.push({ id: p.id, tipo: 'oab', numero_cnj: p.numero_cnj, dryRun: true });
          continue;
        }
        try {
          // Credencial (se houver) para sigilosos
          let customerKey: string | null = null;
          if (p.tenant_id) {
            const { data: cred } = await supabase
              .from('credenciais_judit')
              .select('customer_key')
              .eq('tenant_id', p.tenant_id)
              .eq('status', 'active')
              .limit(1)
              .maybeSingle();
            customerKey = cred?.customer_key ?? null;
          }

          const numeroLimpo = (p.numero_cnj || '').replace(/\D/g, '');
          const payload: any = {
            recurrence: 1,
            search: { search_type: 'lawsuit_cnj', search_key: numeroLimpo },
            callback_url: webhookOAB,
            with_attachments: true,
            ...(customerKey ? { credential: { customer_key: customerKey } } : {}),
          };

          // 1) Cria novo tracking
          const createRes = await fetch(TRACKING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
            body: JSON.stringify(payload),
          });
          const createTxt = await createRes.text();
          if (!createRes.ok) {
            throw new Error(`CREATE ${createRes.status}: ${createTxt.substring(0, 200)}`);
          }
          const createJson = JSON.parse(createTxt);
          const novoTrackingId = createJson.tracking_id;
          if (!novoTrackingId) throw new Error('CREATE sem tracking_id na resposta');

          // 2) Pausa tracking antigo (best-effort)
          if (p.tracking_id) {
            try {
              await fetch(`${TRACKING_URL}/${p.tracking_id}/pause`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
              });
            } catch (_) { /* ignore */ }
          }

          // 3) Atualiza DB (todos processos com mesmo CNJ no tenant)
          let upd = supabase
            .from('processos_oab')
            .update({
              tracking_id: novoTrackingId,
              with_attachments: true,
              updated_at: new Date().toISOString(),
            })
            .eq('numero_cnj', p.numero_cnj);
          if (p.tenant_id) upd = upd.eq('tenant_id', p.tenant_id);
          await upd;

          // 4) Auditoria
          await supabase.from('judit_migracao_attachments').insert({
            tenant_id: p.tenant_id,
            processo_id: p.id,
            tipo: 'oab',
            numero_cnj: p.numero_cnj,
            tracking_id_antigo: p.tracking_id,
            tracking_id_novo: novoTrackingId,
            status: 'migrado',
          });

          await supabase.from('judit_api_logs').insert({
            tenant_id: p.tenant_id,
            tipo_chamada: 'migracao_attachments',
            endpoint: TRACKING_URL,
            metodo: 'POST',
            request_payload: payload,
            request_id: novoTrackingId,
            sucesso: true,
            resposta_status: createRes.status,
          });

          migrados++;
          results.push({ id: p.id, tipo: 'oab', numero_cnj: p.numero_cnj, novoTrackingId, status: 'migrado' });
        } catch (e: any) {
          erros++;
          const msg = e?.message ?? String(e);
          await supabase.from('judit_migracao_attachments').insert({
            tenant_id: p.tenant_id,
            processo_id: p.id,
            tipo: 'oab',
            numero_cnj: p.numero_cnj,
            tracking_id_antigo: p.tracking_id,
            status: 'erro',
            erro: msg,
          });
          results.push({ id: p.id, tipo: 'oab', numero_cnj: p.numero_cnj, status: 'erro', erro: msg });
        }
      }
    }

    // ---- CNPJ ----
    if (tipo === 'cnpj' || tipo === 'all') {
      let q = supabase
        .from('cnpjs_cadastrados')
        .select('id, tenant_id, cnpj, tracking_id')
        .eq('monitoramento_ativo', true)
        .eq('with_attachments', false)
        .not('tracking_id', 'is', null)
        .limit(batchSize);
      if (body.tenantId) q = q.eq('tenant_id', body.tenantId);

      const { data: cnpjs, error } = await q;
      if (error) throw error;

      for (const c of cnpjs || []) {
        processados++;
        if (dryRun) {
          results.push({ id: c.id, tipo: 'cnpj', cnpj: c.cnpj, dryRun: true });
          continue;
        }
        try {
          const cnpjLimpo = (c.cnpj || '').replace(/\D/g, '');
          const payload: any = {
            recurrence: 1,
            search: { search_type: 'cnpj', search_key: cnpjLimpo },
            callback_url: webhookCNPJ,
            with_attachments: true,
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

          if (c.tracking_id) {
            try {
              await fetch(`${TRACKING_URL}/${c.tracking_id}/pause`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': juditApiKey.trim() },
              });
            } catch (_) {}
          }

          await supabase
            .from('cnpjs_cadastrados')
            .update({
              tracking_id: novoTrackingId,
              with_attachments: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', c.id);

          await supabase.from('judit_migracao_attachments').insert({
            tenant_id: c.tenant_id,
            processo_id: c.id,
            tipo: 'cnpj',
            numero_cnj: c.cnpj,
            tracking_id_antigo: c.tracking_id,
            tracking_id_novo: novoTrackingId,
            status: 'migrado',
          });

          migrados++;
          results.push({ id: c.id, tipo: 'cnpj', cnpj: c.cnpj, novoTrackingId, status: 'migrado' });
        } catch (e: any) {
          erros++;
          const msg = e?.message ?? String(e);
          await supabase.from('judit_migracao_attachments').insert({
            tenant_id: c.tenant_id,
            processo_id: c.id,
            tipo: 'cnpj',
            numero_cnj: c.cnpj,
            tracking_id_antigo: c.tracking_id,
            status: 'erro',
            erro: msg,
          });
          results.push({ id: c.id, tipo: 'cnpj', cnpj: c.cnpj, status: 'erro', erro: msg });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processados, migrados, erros, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});