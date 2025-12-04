import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoId } = await req.json();
    
    if (!processoId) {
      throw new Error('processoId e obrigatorio');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Judit] Desativando monitoramento para processo:', processoId);

    // Buscar tracking_id
    const { data: monitoramento, error: fetchError } = await supabase
      .from('processo_monitoramento_judit')
      .select('tracking_id')
      .eq('processo_id', processoId)
      .single();

    if (fetchError || !monitoramento?.tracking_id) {
      throw new Error('Monitoramento nao encontrado');
    }

    const trackingId = monitoramento.tracking_id;

    // Pausar tracking na Judit
    const pauseResponse = await fetch(`https://tracking.prod.judit.io/tracking/${trackingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey,
      },
      body: JSON.stringify({
        status: 'paused',
      }),
    });

    if (!pauseResponse.ok) {
      const error = await pauseResponse.text();
      console.error('[Judit] Erro ao pausar tracking:', error);
      throw new Error(`Erro ao desativar monitoramento: ${pauseResponse.status}`);
    }

    console.log('[Judit] Tracking pausado na Judit');

    // Atualizar status no banco (mantem historico)
    const { error: updateError } = await supabase
      .from('processo_monitoramento_judit')
      .update({
        monitoramento_ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('processo_id', processoId);

    if (updateError) {
      console.error('[Judit] Erro ao atualizar status:', updateError);
      throw updateError;
    }

    console.log('[Judit] Monitoramento desativado com sucesso');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
