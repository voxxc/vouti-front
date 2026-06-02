import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TRACKING_URL = 'https://tracking.prod.judit.io/tracking';
const REQUESTS_URL = 'https://requests.prod.judit.io/responses';

interface BackfillBody {
  trackingId?: string;
  numeroCnj?: string;
  tenantId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: BackfillBody = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let trackingId = body.trackingId || null;
    let processos: any[] = [];

    // Resolver processos alvo (mesmo CNJ + tenant) e tracking_id
    if (body.numeroCnj) {
      let q = supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, tracking_id')
        .eq('numero_cnj', body.numeroCnj);
      if (body.tenantId) q = q.eq('tenant_id', body.tenantId);
      const { data } = await q;
      processos = data || [];
      if (!trackingId) trackingId = processos.find((p: any) => p.tracking_id)?.tracking_id || null;
    } else if (trackingId) {
      const { data } = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, tracking_id')
        .eq('tracking_id', trackingId);
      processos = data || [];
    }

    if (!trackingId) {
      return new Response(JSON.stringify({ success: false, error: 'tracking_id não encontrado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (processos.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'nenhum processo encontrado para o tracking' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = processos[0].tenant_id;

    // 1) Buscar tracking (histórico)
    const trkRes = await fetch(`${TRACKING_URL}/${trackingId}`, {
      headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
    });
    if (!trkRes.ok) {
      const txt = await trkRes.text();
      return new Response(JSON.stringify({ success: false, error: `tracking ${trkRes.status}`, body: txt.substring(0, 400) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const trk = await trkRes.json();

    // 2) Coletar attachments de todas as response_data disponíveis
    const attachments: any[] = [];
    const pageData = Array.isArray(trk.page_data) ? trk.page_data : [];

    for (const item of pageData) {
      const rd = item.response_data;
      if (rd?.attachments && Array.isArray(rd.attachments)) {
        attachments.push(...rd.attachments);
      } else if (item.request_id) {
        // Buscar via responses
        try {
          const r = await fetch(`${REQUESTS_URL}?request_id=${item.request_id}`, {
            headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
          });
          if (r.ok) {
            const j = await r.json();
            for (const it of (j.page_data || [])) {
              if (Array.isArray(it.response_data?.attachments)) {
                attachments.push(...it.response_data.attachments);
              }
            }
          }
        } catch (_) { /* noop */ }
      }
    }

    // Deduplicar por attachment_id
    const seen = new Set<string>();
    const unique = attachments.filter((a: any) => {
      const id = String(a?.attachment_id || a?.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // 3) Upsert em processos_oab_anexos para todos os processos
    let inseridos = 0;
    for (const p of processos) {
      for (const a of unique) {
        const { error } = await supabase
          .from('processos_oab_anexos')
          .upsert({
            processo_oab_id: p.id,
            attachment_id: a.attachment_id || a.id,
            attachment_name: a.attachment_name || a.name || 'Documento',
            extension: a.extension || a.file_extension || null,
            status: a.status || 'done',
            content_description: a.content || a.description || null,
            is_private: a.is_private || false,
            step_id: a.step_id || null,
            tenant_id: p.tenant_id || tenantId,
          }, { onConflict: 'processo_oab_id,attachment_id' });
        if (!error) inseridos++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackingId,
        attachmentsEncontrados: unique.length,
        processosAtualizados: processos.length,
        inseridos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});