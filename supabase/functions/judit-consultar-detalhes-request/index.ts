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
    const { processoOabId, requestId } = await req.json();
    
    if (!processoOabId || !requestId) {
      throw new Error('processoOabId e requestId sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Judit Consultar Request] Consultando request_id:', requestId);

    // Buscar dados do processo para obter CNJ e tenant_id
    const { data: processoData } = await supabase
      .from('processos_oab')
      .select('numero_cnj, tenant_id')
      .eq('id', processoOabId)
      .single();

    if (!processoData) {
      throw new Error('Processo nao encontrado');
    }

    const { numero_cnj: numeroCnj, tenant_id: tenantId } = processoData;

    // GET gratuito usando o request_id existente
    const response = await fetch(
      `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
      {
        method: 'GET',
        headers: {
          'api-key': juditApiKey.trim(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Judit Consultar Request] Erro:', response.status, errorText);
      throw new Error(`Erro na API Judit: ${response.status}`);
    }

    const resultData = await response.json();
    console.log('[Judit Consultar Request] Resposta - count:', resultData.count, 'page_data:', resultData.page_data?.length || 0);

    if (!resultData.page_data || resultData.page_data.length === 0) {
      throw new Error('Nenhum resultado encontrado para este request_id');
    }

    // Extrair dados do resultado
    const pageData = resultData.page_data || [];
    const firstResult = pageData[0] || {};
    const responseData = firstResult.response_data || firstResult;
    const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

    console.log('[Judit Consultar Request] Andamentos encontrados:', steps.length);

    // NOVO: Buscar TODOS os processos com mesmo CNJ no tenant para sincronizar
    const { data: allSharedProcesses } = await supabase
      .from('processos_oab')
      .select('id')
      .eq('numero_cnj', numeroCnj)
      .eq('tenant_id', tenantId);

    const sharedProcessIds = (allSharedProcesses || []).map(p => p.id);
    console.log('[Judit Consultar Request] Processos compartilhados encontrados:', sharedProcessIds.length);

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

    // NOVO: Atualizar TODOS os processos compartilhados com timestamp e request_id
    await supabase
      .from('processos_oab')
      .update({
        detalhes_request_id: requestId,
        ultima_atualizacao_detalhes: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('numero_cnj', numeroCnj)
      .eq('tenant_id', tenantId);

    console.log('[Judit Consultar Request] Concluido:', { 
      andamentosInseridos, 
      totalExistentes: steps.length,
      processosAtualizados: sharedProcessIds.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        andamentosInseridos,
        totalAndamentos: steps.length,
        processosAtualizados: sharedProcessIds.length,
        message: andamentosInseridos > 0 
          ? `${andamentosInseridos} novos andamentos inseridos em ${sharedProcessIds.length} processos`
          : 'Nenhum andamento novo encontrado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Consultar Request] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
