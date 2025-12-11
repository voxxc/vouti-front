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
    const { cnpjId, cnpj, ativar, tenantId, userId } = await req.json();

    if (!cnpjId || !cnpj) {
      throw new Error('cnpjId e cnpj sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpar CNPJ - apenas numeros
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    console.log('[Judit CNPJ] Ativar monitoramento:', ativar, 'para CNPJ:', cnpjLimpo);

    if (ativar) {
      // Ativar monitoramento - POST para /tracking
      const webhookUrl = `${supabaseUrl}/functions/v1/judit-webhook-cnpj`;

      console.log('[Judit CNPJ] Criando tracking com webhook:', webhookUrl);

      const trackingResponse = await fetch('https://tracking.prod.judit.io/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': juditApiKey.trim(),
        },
        body: JSON.stringify({
          recurrence: 1, // Diario
          search: {
            search_type: 'cnpj',
            search_key: cnpjLimpo,
          },
          callback_url: webhookUrl,
        }),
      });

      if (!trackingResponse.ok) {
        const error = await trackingResponse.text();
        console.error('[Judit CNPJ] Erro ao criar tracking:', error);
        throw new Error(`Erro ao ativar monitoramento: ${trackingResponse.status} - ${error}`);
      }

      const trackingData = await trackingResponse.json();
      const trackingId = trackingData.tracking_id;

      console.log('[Judit CNPJ] Tracking criado com ID:', trackingId);

      // Atualizar cnpjs_cadastrados com tracking_id e monitoramento_ativo
      const { error: updateError } = await supabase
        .from('cnpjs_cadastrados')
        .update({
          tracking_id: trackingId,
          monitoramento_ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cnpjId);

      if (updateError) {
        console.error('[Judit CNPJ] Erro ao atualizar cnpj:', updateError);
        throw updateError;
      }

      // Log da chamada para auditoria
      await supabase.from('judit_api_logs').insert({
        tipo_chamada: 'tracking_cnpj_ativar',
        endpoint: 'https://tracking.prod.judit.io/tracking',
        metodo: 'POST',
        request_id: trackingId,
        sucesso: true,
        resposta_status: trackingResponse.status,
        tenant_id: tenantId,
        user_id: userId,
        custo_estimado: 1,
      });

      console.log('[Judit CNPJ] Monitoramento ativado com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          trackingId,
          monitoramentoAtivo: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Desativar monitoramento
      // Buscar tracking_id atual
      const { data: cnpjData, error: fetchError } = await supabase
        .from('cnpjs_cadastrados')
        .select('tracking_id')
        .eq('id', cnpjId)
        .single();

      if (fetchError) {
        console.error('[Judit CNPJ] Erro ao buscar cnpj:', fetchError);
        throw fetchError;
      }

      const trackingId = cnpjData?.tracking_id;

      if (trackingId) {
        // Pausar tracking na Judit API
        console.log('[Judit CNPJ] Pausando tracking:', trackingId);

        try {
          const pauseResponse = await fetch(`https://tracking.prod.judit.io/tracking/${trackingId}/pause`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'api-key': juditApiKey.trim(),
            },
          });

          if (!pauseResponse.ok) {
            const error = await pauseResponse.text();
            console.warn('[Judit CNPJ] Aviso ao pausar tracking:', error);
            // Continua mesmo se falhar - pode ser que o tracking ja foi pausado
          } else {
            console.log('[Judit CNPJ] Tracking pausado com sucesso');
          }
        } catch (pauseError) {
          console.warn('[Judit CNPJ] Erro ao pausar tracking (ignorando):', pauseError);
        }
      }

      // Atualizar cnpjs_cadastrados
      const { error: updateError } = await supabase
        .from('cnpjs_cadastrados')
        .update({
          monitoramento_ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cnpjId);

      if (updateError) {
        console.error('[Judit CNPJ] Erro ao atualizar cnpj:', updateError);
        throw updateError;
      }

      // Log da chamada
      await supabase.from('judit_api_logs').insert({
        tipo_chamada: 'tracking_cnpj_desativar',
        endpoint: `https://tracking.prod.judit.io/tracking/${trackingId}/pause`,
        metodo: 'PUT',
        request_id: trackingId,
        sucesso: true,
        tenant_id: tenantId,
        user_id: userId,
        custo_estimado: 0,
      });

      console.log('[Judit CNPJ] Monitoramento desativado com sucesso');

      return new Response(
        JSON.stringify({
          success: true,
          monitoramentoAtivo: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Judit CNPJ] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
