import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoId, escavadorId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      throw new Error('Token Escavador não configurado');
    }

    // URL do callback (webhook)
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/escavador-webhook`;

    console.log(`[Escavador] Ativando monitoramento para processo ID: ${escavadorId}`);
    console.log(`[Escavador] Callback URL: ${callbackUrl}`);

    // Ativar callback na API Escavador
    const response = await fetch(`https://api.escavador.com/api/v1/processos/${escavadorId}/callback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${escavadorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: callbackUrl,
        eventos: ['movimentacao', 'publicacao', 'audiencia']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Escavador] Erro ao ativar callback:', errorText);
      throw new Error(`Erro ao ativar monitoramento: ${response.status} - ${errorText}`);
    }

    const callbackData = await response.json();
    console.log('[Escavador] Callback ativado:', callbackData);

    // Atualizar no banco
    const { error: updateError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .update({
        monitoramento_ativo: true,
        callback_id: callbackData.id || callbackData.callback_id,
        updated_at: new Date().toISOString()
      })
      .eq('processo_id', processoId);

    if (updateError) {
      console.error('[Escavador] Erro ao atualizar monitoramento:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Monitoramento ativado com sucesso',
        callback_id: callbackData.id || callbackData.callback_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Escavador] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
