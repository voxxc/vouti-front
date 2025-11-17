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
    const { processoId, numeroProcesso } = await req.json();
    
    if (!processoId || !numeroProcesso) {
      throw new Error('processoId e numeroProcesso são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Judit] Ativando monitoramento para:', numeroProcesso);

    // URL do webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/judit-webhook`;

    // Criar tracking na Judit
    const trackingResponse = await fetch('https://tracking.prod.judit.io/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': juditApiKey,
      },
      body: JSON.stringify({
        recurrence: 1, // Diário
        search: {
          search_type: 'lawsuit_cnj',
          search_key: numeroProcesso.replace(/\D/g, ''),
        },
        callback_url: webhookUrl,
      }),
    });

    if (!trackingResponse.ok) {
      const error = await trackingResponse.text();
      console.error('[Judit] Erro ao criar tracking:', error);
      throw new Error(`Erro ao ativar monitoramento: ${trackingResponse.status}`);
    }

    const trackingData = await trackingResponse.json();
    const trackingId = trackingData.id;

    console.log('[Judit] Tracking ID:', trackingId);

    // Atualizar monitoramento no banco
    const { error: updateError } = await supabase
      .from('processo_monitoramento_judit')
      .update({
        tracking_id: trackingId,
        monitoramento_ativo: true,
        recurrence: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('processo_id', processoId);

    if (updateError) {
      console.error('[Judit] Erro ao atualizar monitoramento:', updateError);
      throw updateError;
    }

    console.log('[Judit] Monitoramento ativado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        trackingId,
      }),
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
