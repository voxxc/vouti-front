import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normaliza timestamp para comparacao consistente (YYYY-MM-DDTHH:MM)
const normalizeTimestamp = (ts: string | Date | null): string => {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return String(ts).substring(0, 16);
    return date.toISOString().substring(0, 16);
  } catch {
    return String(ts).substring(0, 16);
  }
};

// Gera chave unica para andamento
const generateAndamentoKey = (dataMovimentacao: string | null, descricao: string | null): string => {
  const normalizedDate = normalizeTimestamp(dataMovimentacao);
  const normalizedDesc = (descricao || '').substring(0, 100).toLowerCase().trim();
  return `${normalizedDate}_${normalizedDesc}`;
};

// Funcao para buscar dados do tracking via API Judit
const fetchTrackingData = async (trackingId: string, juditApiKey: string): Promise<any> => {
  const url = `https://tracking.prod.judit.io/tracking/${trackingId}`;
  console.log('[Judit Webhook OAB] GET tracking:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': juditApiKey,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error('[Judit Webhook OAB] Erro ao buscar tracking:', response.status, await response.text());
    return null;
  }
  
  const data = await response.json();
  console.log('[Judit Webhook OAB] Tracking data recebido:', JSON.stringify(data).substring(0, 500));
  return data;
};

// Funcao para buscar responses por request_id
const fetchResponsesByRequestId = async (requestId: string, juditApiKey: string): Promise<any> => {
  const url = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`;
  console.log('[Judit Webhook OAB] GET responses:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': juditApiKey,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error('[Judit Webhook OAB] Erro ao buscar responses:', response.status, await response.text());
    return null;
  }
  
  const data = await response.json();
  console.log('[Judit Webhook OAB] Responses recebidos:', JSON.stringify(data).substring(0, 500));
  return data;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('[Judit Webhook OAB] ========== INICIO WEBHOOK ==========');
    console.log('[Judit Webhook OAB] Payload recebido:', JSON.stringify(payload).substring(0, 1000));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Passo 1: Extrair tracking_id do payload (reference_id ou origin_id)
    const trackingId = payload.reference_id || payload.origin_id || payload.tracking_id;
    
    if (!trackingId) {
      console.error('[Judit Webhook OAB] tracking_id nao encontrado. Campos:', Object.keys(payload));
      return new Response(
        JSON.stringify({ success: false, error: 'reference_id/tracking_id ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook OAB] Tracking ID:', trackingId, '| reference_type:', payload.reference_type);

    // Buscar processo pelo campo apropriado baseado no reference_type
    let processo: any = null;
    let fetchError: any = null;

    if (payload.reference_type === 'request') {
      // Para consultas avulsas, buscar por detalhes_request_id
      console.log('[Judit Webhook OAB] Tipo request - buscando por detalhes_request_id:', trackingId);
      const result = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, oab_id')
        .eq('detalhes_request_id', trackingId)
        .maybeSingle();
      processo = result.data;
      fetchError = result.error;
      
      // Fallback: tentar buscar pelo número CNJ se o payload tiver essa informação
      if (!processo && payload.payload?.response_data?.code) {
        console.log('[Judit Webhook OAB] Tentando fallback por numero_cnj:', payload.payload.response_data.code);
        const resultCnj = await supabase
          .from('processos_oab')
          .select('id, numero_cnj, tenant_id, oab_id')
          .eq('numero_cnj', payload.payload.response_data.code)
          .limit(1)
          .maybeSingle();
        processo = resultCnj.data;
        fetchError = resultCnj.error;
      }
    } else {
      // Para monitoramentos, buscar por tracking_id (fluxo atual)
      console.log('[Judit Webhook OAB] Tipo tracking - buscando por tracking_id:', trackingId);
      const result = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, oab_id')
        .eq('tracking_id', trackingId)
        .maybeSingle();
      processo = result.data;
      fetchError = result.error;
    }

    if (fetchError || !processo) {
      console.error('[Judit Webhook OAB] Processo nao encontrado. reference_type:', payload.reference_type, '| ID:', trackingId);
      return new Response(
        JSON.stringify({ success: false, error: 'Processo nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook OAB] Processo encontrado:', processo.numero_cnj, '| ID:', processo.id);

    // Passo 2: Tentar extrair steps do payload direto (fallback)
    let steps: any[] = [];
    const responseDataDirect = payload.response_data || payload.payload?.response_data;
    
    if (responseDataDirect?.steps && responseDataDirect.steps.length > 0) {
      console.log('[Judit Webhook OAB] Dados encontrados direto no payload');
      steps = responseDataDirect.steps;
    } else {
      // Passo 3: Buscar dados via API seguindo fluxo correto
      console.log('[Judit Webhook OAB] Buscando dados via API...');
      
      // 3a. GET /tracking/{tracking_id} para obter dados do monitoramento
      const trackingData = await fetchTrackingData(trackingId, juditApiKey);
      
      if (trackingData) {
        // Verificar se tracking_data tem page_data (historico de responses)
        if (trackingData.page_data && trackingData.page_data.length > 0) {
          // Usar o primeiro item do historico (mais recente)
          const latestResponse = trackingData.page_data[0];
          
          // Se ja tiver response_data com steps, usar diretamente
          if (latestResponse.response_data?.steps) {
            console.log('[Judit Webhook OAB] Steps encontrados no historico do tracking');
            steps = latestResponse.response_data.steps;
          } else if (latestResponse.request_id) {
            // 3b. GET /responses?request_id=... para dados completos
            console.log('[Judit Webhook OAB] Buscando responses para request_id:', latestResponse.request_id);
            const responsesData = await fetchResponsesByRequestId(latestResponse.request_id, juditApiKey);
            
            if (responsesData?.page_data) {
              for (const item of responsesData.page_data) {
                if (item.response_data?.steps) {
                  steps = [...steps, ...item.response_data.steps];
                }
              }
            }
          }
        } else if (trackingData.request_id) {
          // Caso tracking retorne request_id diretamente
          console.log('[Judit Webhook OAB] Request ID encontrado no tracking:', trackingData.request_id);
          const responsesData = await fetchResponsesByRequestId(trackingData.request_id, juditApiKey);
          
          if (responsesData?.page_data) {
            for (const item of responsesData.page_data) {
              if (item.response_data?.steps) {
                steps = [...steps, ...item.response_data.steps];
              }
            }
          }
        } else if (trackingData.last_request_id) {
          // Caso tracking retorne last_request_id
          console.log('[Judit Webhook OAB] Last Request ID encontrado:', trackingData.last_request_id);
          const responsesData = await fetchResponsesByRequestId(trackingData.last_request_id, juditApiKey);
          
          if (responsesData?.page_data) {
            for (const item of responsesData.page_data) {
              if (item.response_data?.steps) {
                steps = [...steps, ...item.response_data.steps];
              }
            }
          }
        }
      }
    }

    console.log('[Judit Webhook OAB] Total de steps encontrados:', steps.length);

    if (steps.length === 0) {
      console.log('[Judit Webhook OAB] Nenhum andamento encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum andamento novo', novosAndamentos: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar andamentos existentes do processo principal
    const { data: existingAndamentos } = await supabase
      .from('processos_oab_andamentos')
      .select('descricao, data_movimentacao')
      .eq('processo_oab_id', processo.id);

    const existingKeys = new Set(
      (existingAndamentos || []).map(a => generateAndamentoKey(a.data_movimentacao, a.descricao))
    );

    // Inserir novos andamentos no processo principal
    let novosAndamentos = 0;
    const andamentosParaInserir: any[] = [];

    for (const step of steps) {
      const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
      const descricao = step.content || step.description || step.descricao || '';
      
      const key = generateAndamentoKey(dataMovimentacao, descricao);
      
      if (!existingKeys.has(key) && descricao) {
        andamentosParaInserir.push({
          processo_oab_id: processo.id,
          tenant_id: processo.tenant_id,
          data_movimentacao: dataMovimentacao,
          tipo_movimentacao: step.step_type || step.type || step.tipo || null,
          descricao: descricao,
          dados_completos: step,
          lida: false
        });
        existingKeys.add(key); // Evitar duplicatas dentro do mesmo batch
        novosAndamentos++;
      }
    }

    // Inserir andamentos no processo principal
    if (andamentosParaInserir.length > 0) {
      const { error: insertError } = await supabase
        .from('processos_oab_andamentos')
        .insert(andamentosParaInserir);

      if (insertError) {
        if (!insertError.message?.includes('duplicate') && !insertError.message?.includes('unique')) {
          console.error('[Judit Webhook OAB] Erro ao inserir andamentos:', insertError);
        }
      }
    }

    // Atualizar processo com timestamp da ultima atualizacao
    if (novosAndamentos > 0) {
      await supabase
        .from('processos_oab')
        .update({
          ultima_atualizacao_detalhes: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', processo.id);
    }

    console.log('[Judit Webhook OAB] Novos andamentos inseridos:', novosAndamentos);

    // === PROPAGACAO PARA PROCESSOS COMPARTILHADOS ===
    const { data: processosCompartilhados } = await supabase
      .from('processos_oab')
      .select('id, oab_id, tenant_id')
      .eq('numero_cnj', processo.numero_cnj)
      .eq('tenant_id', processo.tenant_id)
      .neq('id', processo.id);

    console.log('[Judit Webhook OAB] Processos compartilhados:', processosCompartilhados?.length || 0);

    // Propagar andamentos para processos compartilhados
    if (processosCompartilhados && processosCompartilhados.length > 0 && andamentosParaInserir.length > 0) {
      for (const outroProcesso of processosCompartilhados) {
        const { data: existingOutro } = await supabase
          .from('processos_oab_andamentos')
          .select('descricao, data_movimentacao')
          .eq('processo_oab_id', outroProcesso.id);

        const existingKeysOutro = new Set(
          (existingOutro || []).map(a => generateAndamentoKey(a.data_movimentacao, a.descricao))
        );

        const andamentosParaOutro = andamentosParaInserir
          .filter(a => !existingKeysOutro.has(generateAndamentoKey(a.data_movimentacao, a.descricao)))
          .map(a => ({
            ...a,
            processo_oab_id: outroProcesso.id,
            tenant_id: outroProcesso.tenant_id
          }));

        if (andamentosParaOutro.length > 0) {
          const { error: insertOutroError } = await supabase
            .from('processos_oab_andamentos')
            .insert(andamentosParaOutro);

          if (insertOutroError) {
            if (!insertOutroError.message?.includes('duplicate') && !insertOutroError.message?.includes('unique')) {
              console.error('[Judit Webhook OAB] Erro propagando:', insertOutroError);
            }
          }

          await supabase
            .from('processos_oab')
            .update({
              ultima_atualizacao_detalhes: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', outroProcesso.id);
        }

        console.log('[Judit Webhook OAB] Propagado para:', outroProcesso.id, andamentosParaOutro.length);
      }
    }

    // === CRIAR NOTIFICACOES PARA USUARIOS ===
    if (novosAndamentos > 0) {
      const todosOabIds = new Set<string>();
      todosOabIds.add(processo.oab_id);
      
      if (processosCompartilhados) {
        for (const p of processosCompartilhados) {
          if (p.oab_id) todosOabIds.add(p.oab_id);
        }
      }

      const { data: oabs } = await supabase
        .from('oabs_cadastradas')
        .select('id, user_id, tenant_id')
        .in('id', Array.from(todosOabIds));

      if (oabs && oabs.length > 0) {
        const usuariosUnicos = new Map<string, { user_id: string; tenant_id: string }>();
        
        for (const oab of oabs) {
          if (oab.user_id && oab.tenant_id) {
            const key = `${oab.user_id}_${oab.tenant_id}`;
            if (!usuariosUnicos.has(key)) {
              usuariosUnicos.set(key, {
                user_id: oab.user_id,
                tenant_id: oab.tenant_id
              });
            }
          }
        }

        console.log('[Judit Webhook OAB] Usuarios para notificar:', usuariosUnicos.size);

        for (const [, userInfo] of usuariosUnicos) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userInfo.user_id,
              tenant_id: userInfo.tenant_id,
              type: 'andamento_processo',
              title: `${novosAndamentos} novo(s) andamento(s)`,
              content: `Processo ${processo.numero_cnj} recebeu atualizacao`,
              related_project_id: processo.id,
              triggered_by_user_id: userInfo.user_id,
              is_read: false
            });

          if (notifError) {
            console.error('[Judit Webhook OAB] Erro notificacao:', userInfo.user_id, notifError);
          }
        }
      }
    }

    console.log('[Judit Webhook OAB] ========== FIM WEBHOOK ==========');

    return new Response(
      JSON.stringify({ 
        success: true, 
        novosAndamentos,
        processosCompartilhados: processosCompartilhados?.length || 0,
        notificacoesEnviadas: novosAndamentos > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Webhook OAB] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
