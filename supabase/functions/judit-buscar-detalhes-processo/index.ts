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
    const { processoOabId, numeroCnj, tenantId, userId, oabId } = await req.json();
    
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

    // NOVO: Verificar se outro processo com mesmo CNJ ja tem request_id (evitar custo duplicado)
    const { data: existingRequestProcess } = await supabase
      .from('processos_oab')
      .select('id, detalhes_request_id')
      .eq('numero_cnj', numeroCnj)
      .eq('tenant_id', tenantId)
      .not('detalhes_request_id', 'is', null)
      .limit(1)
      .maybeSingle();

    let requestId: string;
    let usedExistingRequest = false;

    if (existingRequestProcess?.detalhes_request_id) {
      // Usar request_id existente de outro processo compartilhado (GET gratuito)
      requestId = existingRequestProcess.detalhes_request_id;
      usedExistingRequest = true;
      console.log('[Judit Detalhes] Usando request_id existente de processo compartilhado:', requestId);
    } else {
      // Fazer POST pago para obter novo request_id
      const requestPayload = {
        search: {
          search_type: 'lawsuit_cnj',
          search_key: numeroLimpo,
          on_demand: true
        }
      };

      console.log('[Judit Detalhes] Payload:', JSON.stringify(requestPayload));

      // Registrar log antes da chamada
      const { data: logData } = await supabase
        .from('judit_api_logs')
        .insert({
          tenant_id: tenantId || null,
          user_id: userId || null,
          oab_id: oabId || null,
          tipo_chamada: 'lawsuit_cnj',
          endpoint: 'https://requests.prod.judit.io/requests',
          metodo: 'POST',
          request_payload: requestPayload,
          sucesso: false,
        })
        .select('id')
        .single();

      const logId = logData?.id;

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
        
        if (logId) {
          await supabase
            .from('judit_api_logs')
            .update({ 
              sucesso: false, 
              resposta_status: response.status, 
              erro_mensagem: errorText 
            })
            .eq('id', logId);
        }
        
        throw new Error(`Erro na API Judit: ${response.status}`);
      }

      const initialData = await response.json();
      requestId = initialData.request_id;
      
      if (logId) {
        await supabase
          .from('judit_api_logs')
          .update({ 
            sucesso: true, 
            resposta_status: 200, 
            request_id: requestId 
          })
          .eq('id', logId);
      }
      
      console.log('[Judit Detalhes] Novo Request ID:', requestId);
    }

    // Polling usando /responses/ para aguardar resultado
    let attempts = 0;
    const maxAttempts = 30;
    let resultData = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
        {
          method: 'GET',
          headers: {
            'api-key': juditApiKey.trim(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!statusResponse.ok) {
        console.log('[Judit Detalhes] Polling erro:', statusResponse.status);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('[Judit Detalhes] Polling resposta - count:', statusData.count, 'page_data:', statusData.page_data?.length || 0);

      if (statusData.page_data && statusData.page_data.length > 0) {
        resultData = statusData;
        console.log('[Judit Detalhes] Dados recebidos com sucesso');
        break;
      }

      if (statusData.count === 0) {
        console.log('[Judit Detalhes] Aguardando processamento... tentativa', attempts + 1);
      }

      attempts++;
    }

    if (!resultData) {
      throw new Error('Timeout aguardando resposta da API Judit');
    }

    // Extrair dados do resultado
    const pageData = resultData.page_data || [];
    const firstResult = pageData[0] || {};
    const responseData = firstResult.response_data || firstResult;
    const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

    console.log('[Judit Detalhes] Andamentos encontrados:', steps.length);

    // NOVO: Buscar TODOS os processos com mesmo CNJ no tenant para sincronizar
    const { data: allSharedProcesses } = await supabase
      .from('processos_oab')
      .select('id')
      .eq('numero_cnj', numeroCnj)
      .eq('tenant_id', tenantId);

    const sharedProcessIds = (allSharedProcesses || []).map(p => p.id);
    console.log('[Judit Detalhes] Processos compartilhados encontrados:', sharedProcessIds.length);

    // Inserir andamentos para TODOS os processos compartilhados
    let andamentosInseridos = 0;
    
    for (const sharedProcessId of sharedProcessIds) {
      // Buscar andamentos existentes para este processo
      const { data: existingAndamentos } = await supabase
        .from('processos_oab_andamentos')
        .select('descricao, data_movimentacao')
        .eq('processo_oab_id', sharedProcessId);

      const existingKeys = new Set(
        (existingAndamentos || []).map(a => `${a.data_movimentacao}_${a.descricao?.substring(0, 50)}`)
      );

      for (const step of steps) {
        const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
        const descricao = step.content || step.description || step.descricao || '';
        
        const key = `${dataMovimentacao}_${descricao.substring(0, 50)}`;
        
        if (!existingKeys.has(key) && descricao) {
          const { error } = await supabase
            .from('processos_oab_andamentos')
            .insert({
              processo_oab_id: sharedProcessId,
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
    }

    // Extrair anexos/attachments se existirem
    const attachments = responseData?.attachments || [];
    let anexosInseridos = 0;
    
    if (attachments.length > 0) {
      console.log('[Judit Detalhes] Anexos encontrados:', attachments.length);
      
      // Inserir anexos para TODOS os processos compartilhados
      for (const sharedProcessId of sharedProcessIds) {
        for (const attachment of attachments) {
          const { error: anexoError } = await supabase
            .from('processos_oab_anexos')
            .upsert({
              processo_oab_id: sharedProcessId,
              attachment_id: attachment.attachment_id || attachment.id,
              attachment_name: attachment.attachment_name || attachment.name || 'Documento',
              extension: attachment.extension || attachment.file_extension,
              status: attachment.status || 'done',
              content_description: attachment.content || attachment.description,
              is_private: attachment.is_private || false,
              step_id: attachment.step_id || null,
              tenant_id: tenantId
            }, {
              onConflict: 'processo_oab_id,attachment_id'
            });
          
          if (!anexoError) {
            anexosInseridos++;
          }
        }
      }
      
      console.log('[Judit Detalhes] Anexos inseridos:', anexosInseridos);
    }

    // NOVO: Atualizar TODOS os processos compartilhados com o request_id
    await supabase
      .from('processos_oab')
      .update({
        detalhes_completos: responseData,
        detalhes_carregados: true,
        detalhes_request_id: requestId,
        detalhes_request_data: new Date().toISOString(),
        ultima_atualizacao_detalhes: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('numero_cnj', numeroCnj)
      .eq('tenant_id', tenantId);

    console.log('[Judit Detalhes] Concluido:', { 
      andamentosInseridos, 
      anexosInseridos, 
      usedExistingRequest,
      processosAtualizados: sharedProcessIds.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        andamentosInseridos,
        anexosInseridos,
        totalAndamentos: steps.length,
        totalAnexos: attachments.length,
        usedExistingRequest,
        processosAtualizados: sharedProcessIds.length
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
