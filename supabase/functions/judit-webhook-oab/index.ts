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

// ==================== AUTOMACAO DE PRAZOS ====================

// Padroes para detectar tipos de atos processuais
const PADROES_ATOS = [
  { tipo: 'contestacao', label: 'Contestação', prazo: 15, padroes: [/contestar/i, /contestação/i, /apresentar defesa/i] },
  { tipo: 'replica', label: 'Réplica', prazo: 15, padroes: [/réplica/i, /impugnação à contestação/i] },
  { tipo: 'embargos_declaracao', label: 'Embargos de Declaração', prazo: 5, padroes: [/embargos de declaração/i, /embargos declaratórios/i] },
  { tipo: 'agravo_instrumento', label: 'Agravo de Instrumento', prazo: 15, padroes: [/agravo de instrumento/i] },
  { tipo: 'agravo_interno', label: 'Agravo Interno', prazo: 15, padroes: [/agravo interno/i, /agravo regimental/i] },
  { tipo: 'apelacao', label: 'Apelação', prazo: 15, padroes: [/apelação/i, /apelar/i] },
  { tipo: 'emenda_inicial', label: 'Emenda à Inicial', prazo: 15, padroes: [/emenda/i, /emendar/i] },
  { tipo: 'pagamento_voluntario', label: 'Pagamento Voluntário', prazo: 3, padroes: [/pagamento voluntário/i, /pagar voluntariamente/i] },
  { tipo: 'manifestacao', label: 'Manifestação', prazo: 15, padroes: [/manifestar/i, /manifestação/i] },
];

// Meses em portugues para parsing de datas
const MESES_PT: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
  'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
  'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
};

// Detecta tipo de ato processual
function detectarTipoAto(descricao: string): { tipo: string; label: string; prazo: number } | null {
  if (!descricao) return null;
  const descLower = descricao.toLowerCase();
  if (!descLower.includes('intimação') && !descLower.includes('intimacao')) return null;
  
  for (const padrao of PADROES_ATOS) {
    for (const regex of padrao.padroes) {
      if (regex.test(descricao)) {
        return { tipo: padrao.tipo, label: padrao.label, prazo: padrao.prazo };
      }
    }
  }
  return null;
}

// Detecta audiencia e extrai data/hora
function detectarAudiencia(descricao: string): { tipo: string; label: string; dataHora: Date | null } | null {
  if (!descricao) return null;
  const descLower = descricao.toLowerCase();
  
  if (!descLower.includes('audiência') && !descLower.includes('audiencia') && 
      !descLower.includes('sessão') && !descLower.includes('sessao')) {
    return null;
  }

  // Descartar confirmacoes de intimacao que apenas referenciam audiencias existentes
  if (/confirmad[oa]\s+(a\s+)?intima[çc][ãa]o/i.test(descricao) || 
      /referente ao evento/i.test(descricao)) {
    console.log('[Judit Webhook OAB] Ignorando confirmacao de intimacao (nao e audiencia nova)');
    return null;
  }
  
  let tipo = 'audiencia';
  let label = 'Audiência';
  
  if (/audiência\s+de\s+conciliação/i.test(descricao)) {
    tipo = 'conciliacao'; label = 'Audiência de Conciliação';
  } else if (/audiência\s+de\s+mediação/i.test(descricao)) {
    tipo = 'mediacao'; label = 'Audiência de Mediação';
  } else if (/audiência\s+de\s+instrução\s+e\s+julgamento/i.test(descricao)) {
    tipo = 'instrucao_julgamento'; label = 'Audiência de Instrução e Julgamento';
  } else if (/audiência\s+de\s+instrução/i.test(descricao)) {
    tipo = 'instrucao'; label = 'Audiência de Instrução';
  } else if (/sessão\s+virtual/i.test(descricao) || /incluído\s+em\s+pauta/i.test(descricao)) {
    tipo = 'sessao_virtual'; label = 'Sessão Virtual de Julgamento';
  }
  
  // Extrair data/hora - Padrao 1: "Agendada para: 01 de abril de 2026 às 14:01"
  let dataHora: Date | null = null;
  const padrao1 = descricao.match(/(?:agendada?\s+para|designada?\s+para)[:\s]+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})(?:\s+[àa]s?\s+(\d{1,2})[:\.](\d{2}))?/i);
  if (padrao1) {
    const [, dia, mesStr, ano, hora, minuto] = padrao1;
    const mes = MESES_PT[mesStr.toLowerCase()];
    if (mes !== undefined) {
      dataHora = new Date(parseInt(ano), mes, parseInt(dia), hora ? parseInt(hora) : 0, minuto ? parseInt(minuto) : 0);
    }
  }
  
  // Padrao 2: "SESSÃO VIRTUAL DE 02/03/2026 00:00"
  if (!dataHora) {
    const padrao2 = descricao.match(/(?:sessão\s+virtual\s+de|pauta\s+de)\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/i);
    if (padrao2) {
      const [, dia, mes, ano, hora, min] = padrao2;
      dataHora = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(min));
    }
  }
  
  // Padrao 3: "(23/01/2026)" ou "Data: 23/01/2026"
  if (!dataHora) {
    const padrao3 = descricao.match(/(?:data[:\s]+)?(\d{2})\/(\d{2})\/(\d{4})(?:\s+(?:hora[:\s]+)?(\d{2})[:\.](\d{2}))?/i);
    if (padrao3) {
      const [, dia, mes, ano, hora, minuto] = padrao3;
      dataHora = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), hora ? parseInt(hora) : 0, minuto ? parseInt(minuto) : 0);
    }
  }
  
  return { tipo, label, dataHora };
}

// Extrai data inicial da intimacao
function extrairDataInicialIntimacao(descricao: string): Date | null {
  // Padrao: "Data inicial da contagem do prazo: 10/12/2024"
  const match = descricao.match(/Data inicial[^:]*:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (match) {
    const [, dia, mes, ano] = match;
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  }
  return null;
}

// Verifica se intimacao esta aberta
function isIntimacaoAberta(descricao: string): boolean {
  const statusMatch = descricao.match(/Status:\s*(ABERTO|FECHADO)/i);
  return statusMatch ? statusMatch[1].toUpperCase() === 'ABERTO' : false;
}

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
    // Validação de webhook secret (se configurado)
    const webhookSecret = Deno.env.get('JUDIT_WEBHOOK_SECRET');
    if (webhookSecret) {
      const provided = req.headers.get('x-webhook-secret');
      if (provided !== webhookSecret) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

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

    // ==================== AUTOMACAO DE PRAZOS ====================
    // Verificar se processo tem automacao ativa
    const { data: processoConfig } = await supabase
      .from('processos_oab')
      .select('prazo_automatico_ativo, prazo_advogado_responsavel_id, prazo_usuarios_marcados, numero_cnj')
      .eq('id', processo.id)
      .single();

    if (processoConfig?.prazo_automatico_ativo && processoConfig.prazo_advogado_responsavel_id) {
      console.log('[Judit Webhook OAB] Automacao ativa - processando prazos automaticos');
      
      for (const step of steps) {
        const descricao = step.content || step.description || step.descricao || '';
        const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
        
        // Verificar se ja existe prazo automatico para este andamento
        const andamentoKey = generateAndamentoKey(dataMovimentacao, descricao);
        
        // Detectar audiencia
        const audiencia = detectarAudiencia(descricao);
        if (audiencia && audiencia.dataHora) {
          console.log('[Judit Webhook OAB] Audiencia detectada:', audiencia.label);
          
          // Verificar duplicata antes de inserir
          const audienciaDate = audiencia.dataHora.toISOString().split('T')[0];
          const { data: existingAud } = await supabase
            .from('deadlines')
            .select('id')
            .eq('processo_oab_id', processo.id)
            .eq('date', audienciaDate)
            .ilike('title', `%${audiencia.label}%`)
            .maybeSingle();

          if (existingAud) {
            console.log('[Judit Webhook OAB] Deadline audiencia duplicado ignorado:', existingAud.id);
            continue;
          }
          
          // Criar prazo para audiencia
          const { data: deadlineAud, error: deadlineAudError } = await supabase
            .from('deadlines')
            .insert({
              title: `📅 ${audiencia.label}`,
              description: `Processo: ${processoConfig.numero_cnj}\n\n${descricao.substring(0, 500)}`,
              date: audiencia.dataHora.toISOString().split('T')[0],
              user_id: processoConfig.prazo_advogado_responsavel_id,
              advogado_responsavel_id: processoConfig.prazo_advogado_responsavel_id,
              processo_oab_id: processo.id,
              tenant_id: processo.tenant_id,
              completed: false,
            })
            .select('id')
            .single();

          if (!deadlineAudError && deadlineAud) {
            // Registrar log
            await supabase.from('prazos_automaticos_log').insert({
              processo_oab_id: processo.id,
              deadline_id: deadlineAud.id,
              tipo_evento: 'audiencia',
              tipo_ato_detectado: audiencia.tipo,
              data_inicio: dataMovimentacao,
              data_fim: audiencia.dataHora.toISOString().split('T')[0],
              tenant_id: processo.tenant_id,
            });

            // Adicionar tags se houver usuarios marcados
            if (processoConfig.prazo_usuarios_marcados?.length > 0) {
              const tags = processoConfig.prazo_usuarios_marcados.map((userId: string) => ({
                deadline_id: deadlineAud.id,
                tagged_user_id: userId,
                tenant_id: processo.tenant_id,
              }));
              await supabase.from('deadline_tags').insert(tags);
            }
            
            console.log('[Judit Webhook OAB] Prazo audiencia criado:', deadlineAud.id);
          }
          continue; // Nao processar como intimacao
        }

        // Detectar intimacao
        const tipoAto = detectarTipoAto(descricao);
        if (tipoAto && isIntimacaoAberta(descricao)) {
          console.log('[Judit Webhook OAB] Intimacao detectada:', tipoAto.label);
          
          // Extrair data inicial ou usar data do andamento
          const dataInicial = extrairDataInicialIntimacao(descricao) || new Date(dataMovimentacao || Date.now());
          
          // Calcular prazo em dias uteis usando funcao do banco
          const { data: dataFimResult } = await supabase.rpc('calcular_prazo_dias_uteis', {
            p_data_inicio: dataInicial.toISOString().split('T')[0],
            p_prazo_dias: tipoAto.prazo,
            p_tenant_id: processo.tenant_id,
          });

          const dataFim = dataFimResult || new Date(dataInicial.getTime() + tipoAto.prazo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          // Verificar duplicata antes de inserir intimacao
          const { data: existingInt } = await supabase
            .from('deadlines')
            .select('id')
            .eq('processo_oab_id', processo.id)
            .eq('date', dataFim)
            .ilike('title', `%${tipoAto.label}%`)
            .maybeSingle();

          if (existingInt) {
            console.log('[Judit Webhook OAB] Deadline intimacao duplicado ignorado:', existingInt.id);
            continue;
          }

          // Criar prazo para intimacao
          const { data: deadline, error: deadlineError } = await supabase
            .from('deadlines')
            .insert({
              title: `⚠️ ${tipoAto.label}`,
              description: `Processo: ${processoConfig.numero_cnj}\nPrazo: ${tipoAto.prazo} dias úteis\n\n${descricao.substring(0, 500)}`,
              date: dataFim,
              user_id: processoConfig.prazo_advogado_responsavel_id,
              advogado_responsavel_id: processoConfig.prazo_advogado_responsavel_id,
              processo_oab_id: processo.id,
              tenant_id: processo.tenant_id,
              completed: false,
            })
            .select('id')
            .single();

          if (!deadlineError && deadline) {
            // Registrar log
            await supabase.from('prazos_automaticos_log').insert({
              processo_oab_id: processo.id,
              deadline_id: deadline.id,
              tipo_evento: 'intimacao',
              tipo_ato_detectado: tipoAto.tipo,
              prazo_dias: tipoAto.prazo,
              data_inicio: dataInicial.toISOString().split('T')[0],
              data_fim: dataFim,
              tenant_id: processo.tenant_id,
            });

            // Adicionar tags se houver usuarios marcados
            if (processoConfig.prazo_usuarios_marcados?.length > 0) {
              const tags = processoConfig.prazo_usuarios_marcados.map((userId: string) => ({
                deadline_id: deadline.id,
                tagged_user_id: userId,
                tenant_id: processo.tenant_id,
              }));
              await supabase.from('deadline_tags').insert(tags);
            }
            
            console.log('[Judit Webhook OAB] Prazo intimacao criado:', deadline.id);
          }
        }
      }
    }

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
