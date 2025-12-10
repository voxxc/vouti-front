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
    const { oabId, tenantId, userId } = await req.json();
    
    if (!oabId) {
      throw new Error('oabId e obrigatorio');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Judit Carregar Lote] Iniciando para OAB:', oabId);

    // Buscar todos os processos da OAB
    const { data: processos, error: fetchError } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, detalhes_request_id, detalhes_carregados')
      .eq('oab_id', oabId)
      .order('ordem_lista', { ascending: true });

    if (fetchError) throw fetchError;
    if (!processos || processos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum processo encontrado', totalProcessado: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Carregar Lote] Total processos:', processos.length);

    let processadosGET = 0;
    let processadosPOST = 0;
    let erros = 0;
    const resultados: { processoId: string; tipo: string; sucesso: boolean; andamentos: number }[] = [];

    for (const processo of processos) {
      try {
        if (processo.detalhes_request_id) {
          // GET gratuito usando request_id existente
          console.log('[Judit Carregar Lote] GET gratuito para:', processo.numero_cnj);
          
          const getResponse = await fetch(
            `https://requests.prod.judit.io/responses?request_id=${processo.detalhes_request_id}&page=1&page_size=100`,
            {
              method: 'GET',
              headers: {
                'api-key': juditApiKey.trim(),
                'Content-Type': 'application/json',
              },
            }
          );

          if (getResponse.ok) {
            const resultData = await getResponse.json();
            const andamentosInseridos = await processarAndamentos(supabase, processo.id, resultData);
            processadosGET++;
            resultados.push({ processoId: processo.id, tipo: 'GET', sucesso: true, andamentos: andamentosInseridos });
          } else {
            erros++;
            resultados.push({ processoId: processo.id, tipo: 'GET', sucesso: false, andamentos: 0 });
          }
        } else {
          // POST pago para processos sem request_id
          console.log('[Judit Carregar Lote] POST pago para:', processo.numero_cnj);
          
          // Limpar numero CNJ
          const numeroCnjLimpo = processo.numero_cnj.replace(/\D/g, '');

          // Log da chamada paga
          const { data: logEntry } = await supabase
            .from('judit_api_logs')
            .insert({
              tenant_id: tenantId,
              user_id: userId,
              oab_id: oabId,
              tipo_chamada: 'lawsuit_cnj_lote',
              endpoint: '/requests',
              metodo: 'POST',
              request_payload: { search_type: 'lawsuit_cnj', search_key: numeroCnjLimpo },
              custo_estimado: 0.00
            })
            .select('id')
            .single();

          const postResponse = await fetch('https://requests.prod.judit.io/requests', {
            method: 'POST',
            headers: {
              'api-key': juditApiKey.trim(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              search: {
                search_type: 'lawsuit_cnj',
                search_key: numeroCnjLimpo,
                on_demand: true
              }
            }),
          });

          if (!postResponse.ok) {
            const errorText = await postResponse.text();
            console.error('[Judit Carregar Lote] Erro POST:', errorText);
            
            if (logEntry?.id) {
              await supabase
                .from('judit_api_logs')
                .update({ sucesso: false, erro_mensagem: errorText, resposta_status: postResponse.status })
                .eq('id', logEntry.id);
            }
            
            erros++;
            resultados.push({ processoId: processo.id, tipo: 'POST', sucesso: false, andamentos: 0 });
            continue;
          }

          const postData = await postResponse.json();
          const requestId = postData.request_id;

          if (!requestId) {
            erros++;
            continue;
          }

          // Salvar request_id imediatamente
          await supabase
            .from('processos_oab')
            .update({
              detalhes_request_id: requestId,
              detalhes_request_data: new Date().toISOString()
            })
            .eq('id', processo.id);

          // Atualizar log
          if (logEntry?.id) {
            await supabase
              .from('judit_api_logs')
              .update({ sucesso: true, request_id: requestId, resposta_status: 200 })
              .eq('id', logEntry.id);
          }

          // Polling para resultado
          let resultData = null;
          for (let attempt = 0; attempt < 40; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const pollResponse = await fetch(
              `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
              {
                method: 'GET',
                headers: {
                  'api-key': juditApiKey.trim(),
                  'Content-Type': 'application/json',
                },
              }
            );

            if (pollResponse.ok) {
              const pollData = await pollResponse.json();
              if (pollData.page_data && pollData.page_data.length > 0) {
                resultData = pollData;
                break;
              }
            }
          }

          if (resultData) {
            const andamentosInseridos = await processarAndamentos(supabase, processo.id, resultData);
            processadosPOST++;
            resultados.push({ processoId: processo.id, tipo: 'POST', sucesso: true, andamentos: andamentosInseridos });
          } else {
            erros++;
            resultados.push({ processoId: processo.id, tipo: 'POST', sucesso: false, andamentos: 0 });
          }
        }

        // Delay entre processos
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error('[Judit Carregar Lote] Erro processando:', processo.numero_cnj, err);
        erros++;
        resultados.push({ processoId: processo.id, tipo: 'error', sucesso: false, andamentos: 0 });
      }
    }

    // Atualizar processo com timestamp
    await supabase
      .from('processos_oab')
      .update({ updated_at: new Date().toISOString() })
      .eq('oab_id', oabId);

    console.log('[Judit Carregar Lote] Concluido:', { processadosGET, processadosPOST, erros });

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessos: processos.length,
        processadosGET,
        processadosPOST,
        erros,
        resultados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Carregar Lote] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Funcao para processar e inserir andamentos
async function processarAndamentos(supabase: any, processoId: string, resultData: any): Promise<number> {
  const pageData = resultData.page_data || [];
  if (pageData.length === 0) return 0;

  const firstResult = pageData[0] || {};
  const responseData = firstResult.response_data || firstResult;
  const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

  // Buscar andamentos existentes para evitar duplicatas
  const { data: existingAndamentos } = await supabase
    .from('processos_oab_andamentos')
    .select('descricao, data_movimentacao')
    .eq('processo_oab_id', processoId);

  const existingKeys = new Set(
    (existingAndamentos || []).map((a: any) => `${a.data_movimentacao}_${a.descricao?.substring(0, 50)}`)
  );

  let andamentosInseridos = 0;
  for (const step of steps) {
    const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
    const descricao = step.content || step.description || step.descricao || '';
    
    const key = `${dataMovimentacao}_${descricao.substring(0, 50)}`;
    
    if (!existingKeys.has(key) && descricao) {
      const { error } = await supabase
        .from('processos_oab_andamentos')
        .insert({
          processo_oab_id: processoId,
          data_movimentacao: dataMovimentacao,
          tipo_movimentacao: step.type || step.tipo || null,
          descricao: descricao,
          dados_completos: step,
          lida: false
        });

      if (!error) {
        andamentosInseridos++;
        existingKeys.add(key);
      }
    }
  }

  // Atualizar processo
  await supabase
    .from('processos_oab')
    .update({
      ultima_atualizacao_detalhes: new Date().toISOString(),
      detalhes_carregados: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', processoId);

  return andamentosInseridos;
}
