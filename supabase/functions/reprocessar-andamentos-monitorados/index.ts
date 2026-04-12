import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRACKING_API_URL = 'https://tracking.prod.judit.io';

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
    const { modo = 'ambos', tenantId, executadoPor } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resultados: any[] = [];
    let processados = 0;

    // 1. Buscar processos monitorados sem andamentos
    if (modo === 'sem_andamentos' || modo === 'ambos') {
      let query = supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, tracking_id, detalhes_completos, detalhes_carregados')
        .eq('monitoramento_ativo', true)
        .not('tracking_id', 'is', null);

      if (tenantId) query = query.eq('tenant_id', tenantId);

      const { data: monitorados } = await query;

      for (const processo of monitorados || []) {
        // Contar andamentos existentes
        const { count: andamentosAntes } = await supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .eq('processo_oab_id', processo.id);

        if ((andamentosAntes || 0) > 0) continue;

        console.log(`[Audit] Processo sem andamentos: ${processo.numero_cnj}`);
        
        // Buscar nome do tenant
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', processo.tenant_id)
          .single();

        let andamentosInseridos = 0;
        let acaoTomada = '';
        let sucesso = false;
        let erroMensagem = '';

        try {
          // Tentar extrair do JSON salvo primeiro
          const detalhes = processo.detalhes_completos;
          let steps: any[] = [];

          if (detalhes) {
            steps = detalhes.steps || detalhes.movements || detalhes.andamentos || [];
            if (steps.length === 0 && detalhes.last_step) {
              steps = [detalhes.last_step];
            }
            if (steps.length > 0) {
              acaoTomada = 'reprocessado_json';
            }
          }

          // Se não tem dados no JSON, buscar via tracking_id (GET gratuito)
          if (steps.length === 0 && processo.tracking_id) {
            acaoTomada = 'reprocessado_api';
            try {
              const trackingResponse = await fetch(
                `${TRACKING_API_URL}/tracking/${processo.tracking_id}`,
                {
                  method: 'GET',
                  headers: { 'api-key': juditApiKey.trim(), 'Content-Type': 'application/json' },
                }
              );

              if (trackingResponse.ok) {
                const trackingData = await trackingResponse.json();
                const latestRequestId = trackingData.last_request_id || trackingData.request_id;

                if (latestRequestId) {
                  // Buscar responses
                  const respResponse = await fetch(
                    `https://requests.prod.judit.io/responses?request_id=${latestRequestId}&page=1&page_size=100`,
                    {
                      method: 'GET',
                      headers: { 'api-key': juditApiKey.trim(), 'Content-Type': 'application/json' },
                    }
                  );

                  if (respResponse.ok) {
                    const respData = await respResponse.json();
                    if (respData.page_data?.length > 0) {
                      const responseData = respData.page_data[0].response_data || respData.page_data[0];
                      steps = responseData.steps || responseData.movements || [];
                      if (steps.length === 0 && responseData.last_step) {
                        steps = [responseData.last_step];
                      }

                      // Salvar detalhes_completos para futuras consultas
                      await supabase
                        .from('processos_oab')
                        .update({
                          detalhes_completos: responseData,
                          detalhes_carregados: true,
                          detalhes_request_id: latestRequestId,
                          ultima_atualizacao_detalhes: new Date().toISOString(),
                        })
                        .eq('id', processo.id);
                    }
                  }
                }
              }
            } catch (apiErr) {
              console.error(`[Audit] Erro API para ${processo.numero_cnj}:`, apiErr);
              erroMensagem = `Erro API: ${apiErr.message}`;
            }
          }

          // Inserir andamentos
          if (steps.length > 0) {
            for (const step of steps) {
              const dataMovimentacao = step.step_date || step.date || step.data || step.data_movimentacao;
              const descricaoOriginal = step.content || step.description || step.descricao || '';
              const tipoMovimentacao = step.step_type || step.type || step.tipo || null;
              const descricao = descricaoOriginal || tipoMovimentacao || 'Movimentação registrada';

              const { error } = await supabase
                .from('processos_oab_andamentos')
                .insert({
                  processo_oab_id: processo.id,
                  tenant_id: processo.tenant_id,
                  data_movimentacao: dataMovimentacao,
                  tipo_movimentacao: tipoMovimentacao,
                  descricao: descricao,
                  dados_completos: step,
                  lida: false,
                });

              if (!error) andamentosInseridos++;
            }
            sucesso = true;
          } else {
            acaoTomada = acaoTomada || 'sem_dados_disponiveis';
            erroMensagem = 'Nenhum andamento encontrado no JSON ou API';
          }
        } catch (err) {
          erroMensagem = err.message;
        }

        // Contar andamentos depois
        const { count: andamentosDepois } = await supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .eq('processo_oab_id', processo.id);

        // Registrar auditoria
        const auditRecord = {
          processo_oab_id: processo.id,
          numero_cnj: processo.numero_cnj,
          tenant_id: processo.tenant_id,
          tenant_nome: tenantData?.name || 'Desconhecido',
          problema: 'sem_andamentos',
          acao_tomada: acaoTomada,
          andamentos_antes: andamentosAntes || 0,
          andamentos_depois: andamentosDepois || 0,
          andamentos_inseridos: andamentosInseridos,
          sucesso,
          erro_mensagem: erroMensagem || null,
          executado_por: executadoPor || null,
        };

        await supabase.from('auditoria_andamentos').insert(auditRecord);
        resultados.push(auditRecord);
        processados++;
      }
    }

    // 2. Buscar processos desatualizados (último andamento > 60 dias)
    if (modo === 'desatualizados' || modo === 'ambos') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 60);

      let query = supabase
        .from('processos_oab')
        .select('id, numero_cnj, tenant_id, tracking_id, detalhes_completos')
        .eq('monitoramento_ativo', true)
        .not('tracking_id', 'is', null);

      if (tenantId) query = query.eq('tenant_id', tenantId);

      const { data: monitorados } = await query;

      for (const processo of monitorados || []) {
        // Verificar último andamento
        const { data: ultimoAndamento } = await supabase
          .from('processos_oab_andamentos')
          .select('data_movimentacao')
          .eq('processo_oab_id', processo.id)
          .order('data_movimentacao', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!ultimoAndamento?.data_movimentacao) continue;

        const ultimaData = new Date(ultimoAndamento.data_movimentacao);
        if (ultimaData >= cutoffDate) continue;

        // Processo desatualizado — tentar via tracking
        console.log(`[Audit] Processo desatualizado: ${processo.numero_cnj}, último: ${ultimoAndamento.data_movimentacao}`);

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', processo.tenant_id)
          .single();

        const { count: andamentosAntes } = await supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .eq('processo_oab_id', processo.id);

        let andamentosInseridos = 0;
        let sucesso = false;
        let erroMensagem = '';

        try {
          if (processo.tracking_id) {
            const trackingResponse = await fetch(
              `${TRACKING_API_URL}/tracking/${processo.tracking_id}`,
              {
                method: 'GET',
                headers: { 'api-key': juditApiKey.trim(), 'Content-Type': 'application/json' },
              }
            );

            if (trackingResponse.ok) {
              const trackingData = await trackingResponse.json();
              const latestRequestId = trackingData.last_request_id || trackingData.request_id;

              if (latestRequestId) {
                const respResponse = await fetch(
                  `https://requests.prod.judit.io/responses?request_id=${latestRequestId}&page=1&page_size=100`,
                  {
                    method: 'GET',
                    headers: { 'api-key': juditApiKey.trim(), 'Content-Type': 'application/json' },
                  }
                );

                if (respResponse.ok) {
                  const respData = await respResponse.json();
                  if (respData.page_data?.length > 0) {
                    const responseData = respData.page_data[0].response_data || respData.page_data[0];
                    const steps = responseData.steps || responseData.movements || [];

                    // Buscar existentes para deduplicar
                    const { data: existingAndamentos } = await supabase
                      .from('processos_oab_andamentos')
                      .select('descricao, data_movimentacao')
                      .eq('processo_oab_id', processo.id);

                    const existingKeys = new Set(
                      (existingAndamentos || []).map((a: any) => generateAndamentoKey(a.data_movimentacao, a.descricao))
                    );

                    for (const step of steps) {
                      const dataMovimentacao = step.step_date || step.date || step.data;
                      const descricaoOriginal = step.content || step.description || step.descricao || '';
                      const tipoMovimentacao = step.step_type || step.type || step.tipo || null;
                      const descricao = descricaoOriginal || tipoMovimentacao || 'Movimentação registrada';
                      const key = generateAndamentoKey(dataMovimentacao, descricao);

                      if (!existingKeys.has(key)) {
                        const { error } = await supabase
                          .from('processos_oab_andamentos')
                          .insert({
                            processo_oab_id: processo.id,
                            tenant_id: processo.tenant_id,
                            data_movimentacao: dataMovimentacao,
                            tipo_movimentacao: tipoMovimentacao,
                            descricao: descricao,
                            dados_completos: step,
                            lida: false,
                          });
                        if (!error) {
                          andamentosInseridos++;
                          existingKeys.add(key);
                        }
                      }
                    }
                    sucesso = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          erroMensagem = err.message;
        }

        const { count: andamentosDepois } = await supabase
          .from('processos_oab_andamentos')
          .select('id', { count: 'exact', head: true })
          .eq('processo_oab_id', processo.id);

        const auditRecord = {
          processo_oab_id: processo.id,
          numero_cnj: processo.numero_cnj,
          tenant_id: processo.tenant_id,
          tenant_nome: tenantData?.name || 'Desconhecido',
          problema: 'desatualizado',
          acao_tomada: 'reprocessado_api',
          andamentos_antes: andamentosAntes || 0,
          andamentos_depois: andamentosDepois || 0,
          andamentos_inseridos: andamentosInseridos,
          sucesso,
          erro_mensagem: erroMensagem || null,
          executado_por: executadoPor || null,
        };

        await supabase.from('auditoria_andamentos').insert(auditRecord);
        resultados.push(auditRecord);
        processados++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processados,
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Audit] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
