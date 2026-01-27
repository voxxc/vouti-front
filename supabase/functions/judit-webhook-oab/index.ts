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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('[Judit Webhook OAB] Payload recebido:', JSON.stringify(payload).substring(0, 500));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair tracking_id do payload
    // Judit envia o tracking_id no campo reference_id (ou origin_id)
    // quando reference_type é "tracking"
    const trackingId = payload.reference_id || payload.origin_id || payload.tracking_id;
    
    if (!trackingId) {
      console.error('[Judit Webhook OAB] tracking_id nao encontrado no payload. Campos disponiveis:', Object.keys(payload));
      return new Response(
        JSON.stringify({ success: false, error: 'reference_id/tracking_id ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook OAB] Tracking ID extraido:', trackingId, '| reference_type:', payload.reference_type);

    // Buscar processo pelo tracking_id COM tenant_id
    const { data: processo, error: fetchError } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, tenant_id, oab_id')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError || !processo) {
      console.error('[Judit Webhook OAB] Processo nao encontrado para tracking_id:', trackingId);
      return new Response(
        JSON.stringify({ success: false, error: 'Processo nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook OAB] Processo encontrado:', processo.numero_cnj);

    // Extrair novos andamentos do payload
    // Judit envia em payload.payload.response_data (nivel aninhado)
    const responseData = payload.payload?.response_data || payload.response_data || payload.data || payload;
    const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

    console.log('[Judit Webhook OAB] Andamentos no payload:', steps.length);

    if (steps.length === 0) {
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
      const dataMovimentacao = step.date || step.data || step.data_movimentacao || step.step_date;
      const descricao = step.description || step.descricao || step.content || '';
      
      const key = generateAndamentoKey(dataMovimentacao, descricao);
      
      if (!existingKeys.has(key) && descricao) {
        andamentosParaInserir.push({
          processo_oab_id: processo.id,
          tenant_id: processo.tenant_id,
          data_movimentacao: dataMovimentacao,
          tipo_movimentacao: step.type || step.tipo || null,
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
        // Se erro de duplicata, ignorar silenciosamente
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

    console.log('[Judit Webhook OAB] Novos andamentos inseridos no processo principal:', novosAndamentos);

    // === PROPAGACAO PARA PROCESSOS COMPARTILHADOS ===
    // Buscar outros processos com mesmo CNJ e tenant_id
    const { data: processosCompartilhados } = await supabase
      .from('processos_oab')
      .select('id, oab_id, tenant_id')
      .eq('numero_cnj', processo.numero_cnj)
      .eq('tenant_id', processo.tenant_id)
      .neq('id', processo.id);

    console.log('[Judit Webhook OAB] Processos compartilhados encontrados:', processosCompartilhados?.length || 0);

    // Propagar andamentos para processos compartilhados
    if (processosCompartilhados && processosCompartilhados.length > 0 && andamentosParaInserir.length > 0) {
      for (const outroProcesso of processosCompartilhados) {
        // Buscar andamentos existentes do processo compartilhado
        const { data: existingOutro } = await supabase
          .from('processos_oab_andamentos')
          .select('descricao, data_movimentacao')
          .eq('processo_oab_id', outroProcesso.id);

        const existingKeysOutro = new Set(
          (existingOutro || []).map(a => generateAndamentoKey(a.data_movimentacao, a.descricao))
        );

        // Filtrar apenas andamentos que nao existem neste processo
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
              console.error('[Judit Webhook OAB] Erro propagando andamentos:', insertOutroError);
            }
          }

          // Atualizar timestamp do processo compartilhado
          await supabase
            .from('processos_oab')
            .update({
              ultima_atualizacao_detalhes: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', outroProcesso.id);
        }

        console.log('[Judit Webhook OAB] Andamentos propagados para processo:', outroProcesso.id, andamentosParaOutro.length);
      }
    }

    // === CRIAR NOTIFICACOES PARA USUARIOS ===
    if (novosAndamentos > 0) {
      // Coletar todos os oab_ids envolvidos (principal + compartilhados)
      const todosOabIds = new Set<string>();
      todosOabIds.add(processo.oab_id);
      
      if (processosCompartilhados) {
        for (const p of processosCompartilhados) {
          if (p.oab_id) todosOabIds.add(p.oab_id);
        }
      }

      // Buscar user_id e tenant_id de cada OAB
      const { data: oabs } = await supabase
        .from('oabs_cadastradas')
        .select('id, user_id, tenant_id')
        .in('id', Array.from(todosOabIds));

      console.log('[Judit Webhook OAB] OABs encontradas para notificacao:', oabs?.length || 0);

      if (oabs && oabs.length > 0) {
        // Criar conjunto de usuarios unicos (user_id + tenant_id)
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

        console.log('[Judit Webhook OAB] Usuarios unicos para notificar:', usuariosUnicos.size);

        // Criar notificacao para cada usuario unico
        for (const [, userInfo] of usuariosUnicos) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userInfo.user_id,
              tenant_id: userInfo.tenant_id,
              type: 'andamento_processo',
              title: `${novosAndamentos} novo(s) andamento(s)`,
              content: `Processo ${processo.numero_cnj} recebeu atualizacao`,
              related_project_id: processo.id, // Armazenamos o processo_oab_id aqui
              triggered_by_user_id: userInfo.user_id, // Sistema notificando o proprio usuario
              is_read: false
            });

          if (notifError) {
            console.error('[Judit Webhook OAB] Erro ao criar notificacao para usuario:', userInfo.user_id, notifError);
          } else {
            console.log('[Judit Webhook OAB] Notificacao criada para usuario:', userInfo.user_id);
          }
        }
      }
    }

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
