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
    const { oabId, oabNumero, oabUf } = await req.json();
    
    if (!oabId || !oabNumero || !oabUf) {
      throw new Error('oabId, oabNumero e oabUf sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Formatar search_key: numero + UF (ex: "92124PR")
    const searchKey = `${oabNumero}${oabUf}`;
    
    console.log('[Judit Sync OAB] Buscando processos para OAB:', searchKey);

    // Chamar /request-document para buscar capas de todos os processos
    const requestPayload = {
      search: {
        search_type: 'oab',
        search_key: searchKey,
        on_demand: true
      }
    };

    console.log('[Judit Sync OAB] Payload:', JSON.stringify(requestPayload));

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
      console.error('[Judit Sync OAB] Erro na requisicao:', response.status, errorText);
      throw new Error(`Erro na API Judit: ${response.status}`);
    }

    const initialData = await response.json();
    const requestId = initialData.request_id;
    
    console.log('[Judit Sync OAB] Request ID:', requestId);

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
      console.log('[Judit Sync OAB] Status:', statusData.status);

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

    // Extrair processos do resultado
    const processos = resultData.response_data?.lawsuits || 
                      resultData.response_data?.processes || 
                      resultData.response_data || [];

    console.log('[Judit Sync OAB] Processos encontrados:', Array.isArray(processos) ? processos.length : 0);

    let processosInseridos = 0;
    let processosAtualizados = 0;

    if (Array.isArray(processos)) {
      for (const processo of processos) {
        const numeroCnj = processo.numero_cnj || processo.lawsuit_cnj || processo.number;
        
        if (!numeroCnj) continue;

        // Extrair partes
        const partes = processo.partes || processo.parties || [];
        const autores = partes
          .filter((p: any) => {
            const tipo = (p.tipo || p.type || '').toLowerCase();
            return tipo.includes('autor') || tipo.includes('requerente') || tipo.includes('exequente');
          })
          .map((p: any) => p.nome || p.name);
        
        const reus = partes
          .filter((p: any) => {
            const tipo = (p.tipo || p.type || '').toLowerCase();
            return tipo.includes('reu') || tipo.includes('réu') || tipo.includes('requerido') || tipo.includes('executado');
          })
          .map((p: any) => p.nome || p.name);

        const processoData = {
          oab_id: oabId,
          numero_cnj: numeroCnj,
          tribunal: processo.tribunal || processo.court || null,
          tribunal_sigla: processo.tribunal_acronym || processo.court_acronym || null,
          parte_ativa: autores.length > 0 ? autores.join(' e ') : null,
          parte_passiva: reus.length > 0 ? reus.join(' e ') : null,
          partes_completas: partes.length > 0 ? partes : null,
          status_processual: processo.status_processual || processo.status || null,
          fase_processual: processo.fase_processual || processo.phase || null,
          data_distribuicao: processo.data_distribuicao || processo.distribution_date || null,
          valor_causa: processo.valor_causa || processo.amount || null,
          juizo: processo.juizo || processo.court_unit || null,
          link_tribunal: processo.link_tribunal || processo.court_link || null,
          capa_completa: processo,
        };

        // Upsert do processo
        const { data: existingProcesso } = await supabase
          .from('processos_oab')
          .select('id')
          .eq('oab_id', oabId)
          .eq('numero_cnj', numeroCnj)
          .single();

        if (existingProcesso) {
          await supabase
            .from('processos_oab')
            .update({
              ...processoData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProcesso.id);
          processosAtualizados++;
        } else {
          const { error: insertError } = await supabase
            .from('processos_oab')
            .insert({
              ...processoData,
              ordem_lista: processosInseridos
            });
          
          if (!insertError) {
            processosInseridos++;
          } else {
            console.error('[Judit Sync OAB] Erro ao inserir processo:', insertError);
          }
        }
      }
    }

    // Atualizar OAB com data de sincronizacao e total
    const totalProcessos = processosInseridos + processosAtualizados;
    await supabase
      .from('oabs_cadastradas')
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_processos: totalProcessos,
        updated_at: new Date().toISOString()
      })
      .eq('id', oabId);

    console.log('[Judit Sync OAB] Sincronizacao concluida:', { processosInseridos, processosAtualizados });

    return new Response(
      JSON.stringify({
        success: true,
        processosInseridos,
        processosAtualizados,
        totalProcessos
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Sync OAB] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
