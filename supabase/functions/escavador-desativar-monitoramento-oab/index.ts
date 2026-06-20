import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ESCAVADOR_BASE = 'https://api.escavador.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { processoOabId } = await req.json();
    if (!processoOabId) throw new Error('processoOabId é obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = Deno.env.get('ESCAVADOR_API_TOKEN');

    const { data: row } = await supabase
      .from('processo_oab_monitoramento_escavador')
      .select('id, monitoramento_id')
      .eq('processo_oab_id', processoOabId)
      .maybeSingle();

    if (row?.monitoramento_id && token) {
      try {
        const r = await fetch(
          `${ESCAVADOR_BASE}/api/v1/monitoramentos-tribunal/${row.monitoramento_id}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          },
        );
        if (!r.ok && r.status !== 404) {
          console.error('[escavador-desat-oab] erro DELETE monitoramento:', r.status, await r.text());
        }
      } catch (e) {
        console.error('[escavador-desat-oab] exception DELETE:', e);
      }
    }

    if (row?.id) {
      await supabase
        .from('processo_oab_monitoramento_escavador')
        .update({
          monitoramento_ativo: false,
          monitoramento_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    }

    await supabase
      .from('processos_oab')
      .update({ monitoramento_ativo: false, updated_at: new Date().toISOString() })
      .eq('id', processoOabId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[escavador-desat-oab] erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});