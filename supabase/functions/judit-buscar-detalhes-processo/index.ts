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
    const { processoOabId, numeroCnj } = await req.json();
    
    if (!processoOabId || !numeroCnj) {
      throw new Error('processoOabId e numeroCnj sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpar numero do processo (apenas digitos)
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    
    console.log('[Judit Detalhes] Buscando detalhes do processo:', numeroLimpo);

    // Chamar /requests com lawsuit_cnj para buscar detalhes completos
    const requestPayload = {
      search: {
        search_type: 'lawsuit_cnj',
        search_key: numeroLimpo,
        on_demand: true
      }
    };

    console.log('[Judit Detalhes] Payload:', JSON.stringify(requestPayload));

    const response = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey.trim(),
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Judit Detalhes] Erro na requisicao:', response.status, errorText);
      throw new Error(`Erro na API Judit: ${response.status}`);
    }

    const initialData = await response.json();
    const requestId = initialData.request_id;
    
    console.log('[Judit Detalhes] Request ID:', requestId);

    // Polling para aguardar resultado
    let attempts = 0;
    const maxAttempts = 30;
    let resultData = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://requests.prod.judit.io/requests/${requestId}`, {
        method: 'GET',
        headers: {
          'api-key': juditApiKey.trim(),
        },
      });

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('[Judit Detalhes] Status:', statusData.status);

      if (statusData.status === 'done' || statusData.status === 'completed') {
        resultData = statusData;
        break;
      } else if (statusData.status === 'failed' || statusData.status === 'error') {
        throw new Error('Busca falhou na API Judit');
      }

      attempts++;
    }

    if (!resultData) {
      throw new Error('Timeout aguardando resposta da API Judit');
    }

    // Extrair dados do resultado
    const responseData = resultData.response_data;
    const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

    console.log('[Judit Detalhes] Andamentos encontrados:', steps.length);

    // Buscar andamentos existentes para evitar duplicatas
    const { data: existingAndamentos } = await supabase
      .from('processos_oab_andamentos')
      .select('descricao, data_movimentacao')
      .eq('processo_oab_id', processoOabId);

    const existingKeys = new Set(
      (existingAndamentos || []).map(a => `${a.data_movimentacao}_${a.descricao?.substring(0, 50)}`)
    );

    // Inserir novos andamentos
    let andamentosInseridos = 0;
    for (const step of steps) {
      const dataMovimentacao = step.date || step.data || step.data_movimentacao;
      const descricao = step.description || step.descricao || step.content || '';
      
      const key = `${dataMovimentacao}_${descricao.substring(0, 50)}`;
      
      if (!existingKeys.has(key) && descricao) {
        const { error } = await supabase
          .from('processos_oab_andamentos')
          .insert({
            processo_oab_id: processoOabId,
            data_movimentacao: dataMovimentacao,
            tipo_movimentacao: step.type || step.tipo || null,
            descricao: descricao,
            dados_completos: step,
            lida: false
          });

        if (!error) {
          andamentosInseridos++;
        }
      }
    }

    // Atualizar processo com detalhes completos
    await supabase
      .from('processos_oab')
      .update({
        detalhes_completos: responseData,
        detalhes_carregados: true,
        ultima_atualizacao_detalhes: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', processoOabId);

    console.log('[Judit Detalhes] Concluido:', { andamentosInseridos });

    return new Response(
      JSON.stringify({
        success: true,
        andamentosInseridos,
        totalAndamentos: steps.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Detalhes] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
