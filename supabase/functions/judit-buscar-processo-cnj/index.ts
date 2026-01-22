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
    const { numeroCnj, oabId, tenantId, userId } = await req.json();
    
    if (!numeroCnj || !oabId) {
      throw new Error('numeroCnj e oabId sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpar numero do processo (apenas digitos)
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    
    console.log('[Judit Import CNJ] Buscando processo:', numeroLimpo);

    // Verificar se processo ja existe para esta OAB
    const { data: existente } = await supabase
      .from('processos_oab')
      .select('id')
      .eq('oab_id', oabId)
      .eq('numero_cnj', numeroCnj)
      .maybeSingle();

    if (existente) {
      throw new Error('Este processo ja esta cadastrado para esta OAB');
    }

    // Chamar /requests com lawsuit_cnj
    const requestPayload = {
      search: {
        search_type: 'lawsuit_cnj',
        search_key: numeroLimpo,
        on_demand: true
      }
    };

    console.log('[Judit Import CNJ] Payload:', JSON.stringify(requestPayload));

    // Registrar log antes da chamada
    const { data: logData } = await supabase
      .from('judit_api_logs')
      .insert({
        tenant_id: tenantId || null,
        user_id: userId || null,
        oab_id: oabId,
        tipo_chamada: 'lawsuit_cnj_import',
        endpoint: 'https://requests.prod.judit.io/requests',
        metodo: 'POST',
        request_payload: requestPayload,
        sucesso: false,
        custo_estimado: 1
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
      console.error('[Judit Import CNJ] Erro na requisicao:', response.status, errorText);
      
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
    const requestId = initialData.request_id;
    
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
    
    console.log('[Judit Import CNJ] Request ID:', requestId);

    // Polling para obter resultado - aumentado para 90 segundos (45 tentativas x 2s)
    let attempts = 0;
    const maxAttempts = 45;
    let resultData = null;

    // Aguardar 3 segundos iniciais para dar tempo da API processar
    await new Promise(resolve => setTimeout(resolve, 3000));

    while (attempts < maxAttempts) {
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
        console.log('[Judit Import CNJ] Polling erro:', statusResponse.status);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      const statusData = await statusResponse.json();
      const pageDataLength = statusData.page_data?.length || 0;
      
      // Log a cada 5 tentativas para reduzir ruído
      if (attempts % 5 === 0 || pageDataLength > 0) {
        console.log('[Judit Import CNJ] Polling tentativa', attempts + 1, '- page_data:', pageDataLength);
      }

      if (statusData.page_data && statusData.page_data.length > 0) {
        resultData = statusData;
        console.log('[Judit Import CNJ] Dados recebidos após', attempts + 1, 'tentativas');
        break;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Se não recebeu dados completos, cadastrar processo com informações mínimas
    if (!resultData) {
      console.log('[Judit Import CNJ] Sem dados detalhados - cadastrando com informações mínimas');
      
      // Criar processo com dados mínimos (sigilo ou indisponível)
      const novoProcessoMinimo = {
        oab_id: oabId,
        tenant_id: tenantId || null,
        numero_cnj: numeroCnj,
        parte_ativa: '(Processo em sigilo ou dados indisponíveis)',
        parte_passiva: '',
        tribunal: '',
        tribunal_sigla: '',
        capa_completa: { sigilo: true, request_id: requestId },
        detalhes_completos: null,
        detalhes_carregados: false,
        detalhes_request_id: requestId,
        detalhes_request_data: new Date().toISOString(),
        importado_manualmente: true
      };

      const { data: processoInserido, error: insertError } = await supabase
        .from('processos_oab')
        .insert(novoProcessoMinimo)
        .select('id')
        .single();

      if (insertError) {
        console.error('[Judit Import CNJ] Erro ao inserir processo mínimo:', insertError);
        throw new Error('Erro ao salvar processo: ' + insertError.message);
      }

      // Atualizar contador de processos na OAB
      const { count } = await supabase
        .from('processos_oab')
        .select('id', { count: 'exact', head: true })
        .eq('oab_id', oabId);

      await supabase
        .from('oabs_cadastradas')
        .update({ total_processos: count || 0 })
        .eq('id', oabId);

      console.log('[Judit Import CNJ] Processo mínimo criado:', processoInserido.id);

      return new Response(
        JSON.stringify({
          success: true,
          processoId: processoInserido.id,
          andamentosInseridos: 0,
          totalAndamentos: 0,
          dadosCompletos: false,
          mensagem: 'Processo cadastrado sem dados detalhados (sigilo ou indisponível)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair dados do resultado
    const pageData = resultData.page_data || [];
    const firstResult = pageData[0] || {};
    const responseData = firstResult.response_data || firstResult;
    
    // Log da estrutura para debug
    console.log('[Judit Import CNJ] Estrutura resposta:', {
      hasSteps: !!responseData.steps,
      stepsLength: responseData.steps?.length || 0,
      hasMovements: !!responseData.movements,
      hasAndamentos: !!responseData.andamentos,
      hasLastSteps: !!responseData.last_steps,
      hasHistory: !!responseData.history,
      pageDataItems: pageData.length,
      responseKeys: Object.keys(responseData).slice(0, 15).join(', ')
    });
    
    // Extrair partes com lógica melhorada (suporte a 'side', 2ª instância, fallbacks)
    let parteAtiva = '';
    let partePassiva = '';
    const parties = responseData.parties || [];
    
    // Identificar autores/parte ativa
    const autores = parties
      .filter((p: any) => {
        const tipo = (p.person_type || p.tipo || '').toUpperCase();
        const side = (p.side || '').toLowerCase();
        const papel = (p.role || p.papel || '').toLowerCase();
        return side === 'active' || side === 'plaintiff' || side === 'author' ||
               tipo.includes('ATIVO') || tipo.includes('AUTOR') || tipo.includes('REQUERENTE') || tipo.includes('EXEQUENTE') ||
               papel.includes('autor') || papel.includes('requerente') || papel.includes('ativo');
      })
      .map((p: any) => p.name || p.nome)
      .filter(Boolean);
    
    // Identificar réus/parte passiva
    const reus = parties
      .filter((p: any) => {
        const tipo = (p.person_type || p.tipo || '').toUpperCase();
        const side = (p.side || '').toLowerCase();
        const papel = (p.role || p.papel || '').toLowerCase();
        return side === 'passive' || side === 'defendant' ||
               tipo.includes('PASSIVO') || tipo.includes('REU') || tipo.includes('RÉU') || tipo.includes('REQUERIDO') || tipo.includes('EXECUTADO') ||
               papel.includes('réu') || papel.includes('reu') || papel.includes('requerido') || papel.includes('passivo');
      })
      .map((p: any) => p.name || p.nome)
      .filter(Boolean);
    
    // Identificar interessados (comum em 2ª instância)
    const interessados = parties
      .filter((p: any) => {
        const side = (p.side || '').toLowerCase();
        const tipo = (p.person_type || p.tipo || '').toUpperCase();
        return side === 'interested' || side === 'third_party' || 
               tipo.includes('INTERESSADO') || tipo.includes('TERCEIRO');
      })
      .map((p: any) => p.name || p.nome)
      .filter(Boolean);
    
    parteAtiva = autores.length > 0 ? autores.join(' e ') : '';
    partePassiva = reus.length > 0 ? reus.join(' e ') : '';
    
    // Fallback 1: Se não encontrou autor/réu mas tem interessado
    if (!parteAtiva && !partePassiva && interessados.length > 0) {
      parteAtiva = interessados.join(' e ');
      partePassiva = '(Parte interessada - processo recursal)';
    }
    
    // Fallback 2: Campo "name" com padrão " X "
    if (!parteAtiva && !partePassiva && responseData.name && responseData.name.includes(' X ')) {
      const partes = responseData.name.split(' X ');
      parteAtiva = partes[0]?.trim() || '';
      partePassiva = partes[1]?.trim() || '';
    }
    
    // Fallback 3: Campo "name" direto para processos de 2ª instância
    const instance = responseData.instance || responseData.instancia;
    if (!parteAtiva && !partePassiva && responseData.name && instance && instance >= 2) {
      parteAtiva = responseData.name;
      partePassiva = '(Processo de 2ª instância)';
    }
    
    // Fallback 4: Se ainda não tem partes mas tem "name"
    if (!parteAtiva && !partePassiva && responseData.name && !responseData.name.includes(' X ')) {
      parteAtiva = responseData.name;
    }
    
    // Extrair tribunal
    const tribunalInfo = responseData.courts?.[0] || {};
    const tribunal = tribunalInfo.name || '';
    const tribunalSigla = tribunalInfo.acronym || '';

    // Criar novo processo
    const novoProcesso = {
      oab_id: oabId,
      tenant_id: tenantId || null,
      numero_cnj: numeroCnj,
      parte_ativa: parteAtiva,
      parte_passiva: partePassiva,
      tribunal: tribunal,
      tribunal_sigla: tribunalSigla,
      capa_completa: responseData,
      detalhes_completos: responseData,
      detalhes_carregados: true,
      detalhes_request_id: requestId,
      detalhes_request_data: new Date().toISOString(),
      importado_manualmente: true
    };

    const { data: processoInserido, error: insertError } = await supabase
      .from('processos_oab')
      .insert(novoProcesso)
      .select('id')
      .single();

    if (insertError) {
      console.error('[Judit Import CNJ] Erro ao inserir processo:', insertError);
      throw new Error('Erro ao salvar processo: ' + insertError.message);
    }

    const processoOabId = processoInserido.id;
    console.log('[Judit Import CNJ] Processo criado:', processoOabId);

    // Buscar andamentos em múltiplos locais possíveis
    let steps = responseData?.steps 
      || responseData?.movements 
      || responseData?.andamentos
      || responseData?.history
      || responseData?.last_steps
      || [];
    
    // Se ainda vazio, verificar em page_data separadamente
    if (steps.length === 0 && pageData.length > 1) {
      console.log('[Judit Import CNJ] Buscando steps em page_data alternativo...');
      for (const item of pageData) {
        const itemData = item.response_data || item;
        const itemSteps = itemData.steps || itemData.movements || itemData.andamentos || [];
        if (itemSteps.length > 0) {
          steps = itemSteps;
          console.log('[Judit Import CNJ] Encontrado steps em page_data alternativo:', itemSteps.length);
          break;
        }
      }
    }

    let andamentosInseridos = 0;

    // Se steps ainda vazio, fazer segunda tentativa de busca
    if (steps.length === 0) {
      console.log('[Judit Import CNJ] Steps vazios - fazendo segunda busca com delay...');
      
      // Aguardar 5 segundos para API processar
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Polling adicional (até 3 tentativas)
      let stepsAttempts = 0;
      const maxStepsAttempts = 3;
      
      while (steps.length === 0 && stepsAttempts < maxStepsAttempts) {
        console.log('[Judit Import CNJ] Tentativa steps', stepsAttempts + 1);
        
        const retryResponse = await fetch(
          `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
          {
            method: 'GET',
            headers: {
              'api-key': juditApiKey.trim(),
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          console.log('[Judit Import CNJ] Retry page_data:', retryData.page_data?.length || 0);
          
          // Procurar steps em todos os items
          for (const item of (retryData.page_data || [])) {
            const itemData = item.response_data || item;
            const itemSteps = itemData.steps 
              || itemData.movements 
              || itemData.andamentos 
              || itemData.history
              || itemData.last_steps
              || [];
            
            if (itemSteps.length > 0) {
              steps = itemSteps;
              console.log('[Judit Import CNJ] Steps encontrados no retry:', itemSteps.length);
              break;
            }
          }
        }
        
        if (steps.length === 0) {
          stepsAttempts++;
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5s entre tentativas
        }
      }
      
      if (steps.length === 0) {
        console.log('[Judit Import CNJ] Nenhum step encontrado após todas as tentativas');
      }
    }

    // Inserir andamentos encontrados
    for (const step of steps) {
      const dataMovimentacao = step.step_date || step.date || step.data || step.created_at;
      const descricao = step.content || step.description || step.descricao || step.text || '';
      const tipoMovimentacao = step.type || step.tipo || step.step_type || null;
      
      if (descricao) {
        const { error } = await supabase
          .from('processos_oab_andamentos')
          .insert({
            processo_oab_id: processoOabId,
            tenant_id: tenantId,
            data_movimentacao: dataMovimentacao,
            tipo_movimentacao: tipoMovimentacao,
            descricao: descricao,
            dados_completos: step,
            lida: false
          });

        if (!error) {
          andamentosInseridos++;
        } else {
          console.error('[Judit Import CNJ] Erro ao inserir andamento:', error.message);
        }
      }
    }

    // Atualizar contador de processos na OAB
    const { count } = await supabase
      .from('processos_oab')
      .select('id', { count: 'exact', head: true })
      .eq('oab_id', oabId);

    await supabase
      .from('oabs_cadastradas')
      .update({ total_processos: count || 0 })
      .eq('id', oabId);

    console.log('[Judit Import CNJ] Concluido:', { 
      andamentosInseridos, 
      totalStepsEncontrados: steps.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        processoId: processoOabId,
        andamentosInseridos,
        totalAndamentos: steps.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Import CNJ] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
