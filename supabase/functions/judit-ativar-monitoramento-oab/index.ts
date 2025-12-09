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
    const { processoOabId, numeroCnj, ativar, tenantId, userId, oabId } = await req.json();
    
    if (!processoOabId || !numeroCnj) {
      throw new Error('processoOabId e numeroCnj sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar processo atual
    const { data: processo, error: fetchError } = await supabase
      .from('processos_oab')
      .select('tracking_id, monitoramento_ativo')
      .eq('id', processoOabId)
      .single();

    if (fetchError) {
      throw new Error('Processo nao encontrado');
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/judit-webhook-oab`;
    const numeroLimpo = numeroCnj.replace(/\D/g, '');

    if (ativar) {
      // ATIVAR monitoramento
      console.log('[Judit Monitor] Ativando monitoramento para:', numeroLimpo);

      const trackingPayload = {
        recurrence: 1, // Diario
        search: {
          search_type: 'lawsuit_cnj',
          search_key: numeroLimpo,
        },
        callback_url: webhookUrl,
      };

      // Registrar log antes da chamada
      const { data: logData } = await supabase
        .from('judit_api_logs')
        .insert({
          tenant_id: tenantId || null,
          user_id: userId || null,
          oab_id: oabId || null,
          tipo_chamada: 'tracking',
          endpoint: 'https://tracking.prod.judit.io/tracking',
          metodo: 'POST',
          request_payload: trackingPayload,
          sucesso: false,
        })
        .select('id')
        .single();

      const logId = logData?.id;

      const trackingResponse = await fetch('https://tracking.prod.judit.io/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': juditApiKey.trim(),
        },
        body: JSON.stringify(trackingPayload),
      });

      if (!trackingResponse.ok) {
        const error = await trackingResponse.text();
        console.error('[Judit Monitor] Erro ao criar tracking:', error);
        
        // Atualizar log com erro
        if (logId) {
          await supabase
            .from('judit_api_logs')
            .update({ 
              sucesso: false, 
              resposta_status: trackingResponse.status, 
              erro_mensagem: error 
            })
            .eq('id', logId);
        }
        
        throw new Error(`Erro ao ativar monitoramento: ${trackingResponse.status}`);
      }

      const trackingData = await trackingResponse.json();
      const trackingId = trackingData.tracking_id;

      // Atualizar log com sucesso
      if (logId) {
        await supabase
          .from('judit_api_logs')
          .update({ 
            sucesso: true, 
            resposta_status: 200, 
            request_id: trackingId 
          })
          .eq('id', logId);
      }

      console.log('[Judit Monitor] Tracking ID:', trackingId);

      // Atualizar processo
      await supabase
        .from('processos_oab')
        .update({
          tracking_id: trackingId,
          monitoramento_ativo: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', processoOabId);

      return new Response(
        JSON.stringify({ success: true, trackingId, ativo: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // DESATIVAR monitoramento
      console.log('[Judit Monitor] Desativando monitoramento para:', numeroLimpo);

      if (processo.tracking_id) {
        // Pausar tracking na Judit
        const pauseResponse = await fetch(`https://tracking.prod.judit.io/tracking/${processo.tracking_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'api-key': juditApiKey.trim(),
          },
          body: JSON.stringify({ status: 'paused' }),
        });

        if (!pauseResponse.ok) {
          console.error('[Judit Monitor] Erro ao pausar tracking:', await pauseResponse.text());
          // Continua mesmo se falhar na API
        }
      }

      // Atualizar processo (mantém tracking_id para possível reativação)
      await supabase
        .from('processos_oab')
        .update({
          monitoramento_ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', processoOabId);

      return new Response(
        JSON.stringify({ success: true, ativo: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Judit Monitor] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
