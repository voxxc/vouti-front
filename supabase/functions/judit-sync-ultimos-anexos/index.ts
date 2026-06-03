import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TRACKING_URL = 'https://tracking.prod.judit.io/tracking';
const REQUESTS_URL = 'https://requests.prod.judit.io/responses';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { processoId, limite = 5 } = await req.json().catch(() => ({}));
    if (!processoId) {
      return new Response(JSON.stringify({ success: false, error: 'processoId obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const { data: processo, error: pErr } = await supabase
      .from('processos_oab')
      .select('id, tracking_id, tenant_id, numero_cnj')
      .eq('id', processoId)
      .maybeSingle();
    if (pErr || !processo) {
      return new Response(JSON.stringify({ success: false, error: 'processo não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!processo.tracking_id) {
      return new Response(JSON.stringify({ success: false, error: 'processo sem tracking_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Contadores antes
    const { data: anexosAntes } = await supabase
      .from('processos_oab_anexos')
      .select('status')
      .eq('processo_oab_id', processoId);
    const beforeCounts = (anexosAntes || []).reduce((acc: any, r: any) => {
      acc[r.status || 'null'] = (acc[r.status || 'null'] || 0) + 1; return acc;
    }, {});

    // 1) GET tracking → last_request_id
    const trkRes = await fetch(`${TRACKING_URL}/${processo.tracking_id}`, {
      headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
    });
    if (!trkRes.ok) {
      const t = await trkRes.text();
      return new Response(JSON.stringify({ success: false, error: 'tracking falhou', status: trkRes.status, body: t.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const trk = await trkRes.json();
    const lastRequestId = trk.last_request_id || trk.request_id;
    if (!lastRequestId) {
      return new Response(JSON.stringify({ success: false, error: 'last_request_id ausente', tracking: trk }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) GET responses?request_id=...
    const respRes = await fetch(`${REQUESTS_URL}?request_id=${lastRequestId}&page=1&page_size=100`, {
      headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
    });
    if (!respRes.ok) {
      const t = await respRes.text();
      return new Response(JSON.stringify({ success: false, error: 'responses falhou', status: respRes.status, body: t.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const respJson = await respRes.json();
    const pageData = respJson.page_data || [];
    if (pageData.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'response sem page_data', lastRequestId }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pode haver múltiplas responses (mesmo CNJ em vários tribunais). Juntar steps de todas.
    const allSteps: any[] = [];
    for (const item of pageData) {
      const rd = item.response_data || item;
      const steps = rd.steps || rd.movements || [];
      for (const s of steps) allSteps.push(s);
    }

    // Ordenar por data desc e pegar os N últimos
    allSteps.sort((a: any, b: any) => {
      const da = new Date(a.step_date || a.date || 0).getTime();
      const db = new Date(b.step_date || b.date || 0).getTime();
      return db - da;
    });
    const stepsAlvo = allSteps.slice(0, limite);

    // Upsert anexos dos steps alvo
    const detalhesUpsert: any[] = [];
    let anexosAtualizados = 0;
    for (const step of stepsAlvo) {
      const stepId = (step.step_id || '').toString().toLowerCase() || null;
      const atts = Array.isArray(step.attachments) ? step.attachments : [];
      for (const a of atts) {
        const attachmentId = a.attachment_id || a.id;
        if (!attachmentId) continue;
        const payload = {
          processo_oab_id: processoId,
          tenant_id: processo.tenant_id,
          attachment_id: attachmentId,
          attachment_name: a.attachment_name || a.name || 'Documento',
          extension: a.extension || a.file_extension || null,
          status: a.status || 'done',
          content_description: a.content || a.description || null,
          is_private: a.is_private || false,
          step_id: stepId,
        };
        const { error } = await supabase
          .from('processos_oab_anexos')
          .upsert(payload, { onConflict: 'processo_oab_id,attachment_id' });
        if (!error) {
          anexosAtualizados++;
          detalhesUpsert.push({ attachment_id: attachmentId, status: payload.status, step_id: stepId });
        } else {
          detalhesUpsert.push({ attachment_id: attachmentId, error: error.message });
        }
      }
    }

    // Contadores depois
    const { data: anexosDepois } = await supabase
      .from('processos_oab_anexos')
      .select('status')
      .eq('processo_oab_id', processoId);
    const afterCounts = (anexosDepois || []).reduce((acc: any, r: any) => {
      acc[r.status || 'null'] = (acc[r.status || 'null'] || 0) + 1; return acc;
    }, {});

    return new Response(JSON.stringify({
      success: true,
      processoId,
      numeroCnj: processo.numero_cnj,
      trackingId: processo.tracking_id,
      lastRequestId,
      stepsTotalNaResposta: allSteps.length,
      stepsConsiderados: stepsAlvo.length,
      anexosAtualizados,
      beforeCounts,
      afterCounts,
      detalhesUpsert,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});