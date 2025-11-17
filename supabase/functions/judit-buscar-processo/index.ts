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

    console.log('[Judit] Buscando processo:', numeroProcesso);

    // Fazer requisição à API Judit
    const juditResponse = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': juditApiKey,
      },
      body: JSON.stringify({
        search_type: 'lawsuit_cnj',
        search_key: numeroProcesso.replace(/\D/g, ''),
      }),
    });

    if (!juditResponse.ok) {
      const error = await juditResponse.text();
      console.error('[Judit] Erro na API:', error);
      throw new Error(`Erro na API Judit: ${juditResponse.status}`);
    }

    const juditData = await juditResponse.json();
    const requestId = juditData.id;

    console.log('[Judit] Request ID:', requestId);

    // Aguardar resposta (polling)
    let attempts = 0;
    let responseData = null;

    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://requests.prod.judit.io/requests/${requestId}`, {
        headers: { 'x-api-key': juditApiKey },
      });

      const status = await statusResponse.json();
      
      if (status.response_data) {
        responseData = status.response_data;
        break;
      }

      attempts++;
    }

    if (!responseData) {
      throw new Error('Timeout ao buscar dados do processo');
    }

    console.log('[Judit] Dados recebidos:', responseData);

    // Salvar monitoramento
    const { data: monitoramento, error: monitoramentoError } = await supabase
      .from('processo_monitoramento_judit')
      .upsert({
        processo_id: processoId,
        judit_data: responseData,
        ultimo_request_id: requestId,
        ultima_atualizacao: new Date().toISOString(),
        monitoramento_ativo: false,
      }, { onConflict: 'processo_id' })
      .select()
      .single();

    if (monitoramentoError) {
      console.error('[Judit] Erro ao salvar monitoramento:', monitoramentoError);
      throw monitoramentoError;
    }

    // Extrair e salvar andamentos
    const steps = responseData.steps || [];
    let savedCount = 0;

    for (const step of steps) {
      const { error: andamentoError } = await supabase
        .from('processo_andamentos_judit')
        .insert({
          processo_id: processoId,
          monitoramento_id: monitoramento.id,
          tipo_movimentacao: step.step_type || 'Movimentação',
          descricao: step.step_description || step.content || 'Sem descrição',
          data_movimentacao: step.step_date || new Date().toISOString(),
          dados_completos: step,
          lida: false,
        });

      if (!andamentoError) {
        savedCount++;
      }
    }

    // Atualizar contador
    await supabase
      .from('processo_monitoramento_judit')
      .update({ total_movimentacoes: savedCount })
      .eq('id', monitoramento.id);

    console.log('[Judit] Salvos', savedCount, 'andamentos');

    return new Response(
      JSON.stringify({
        success: true,
        totalMovimentacoes: savedCount,
        requestId,
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
