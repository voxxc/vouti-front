import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { oabId, requestId } = await req.json();
    
    if (!oabId || !requestId) {
      return new Response(
        JSON.stringify({ error: 'oabId e requestId sao obrigatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Consultar] Iniciando consulta GRATUITA');
    console.log('[Judit Consultar] OAB ID:', oabId);
    console.log('[Judit Consultar] Request ID:', requestId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');

    if (!juditApiKey) {
      return new Response(
        JSON.stringify({ error: 'JUDIT_API_KEY nao configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET /responses/ - GRATUITO! Nao gera custos
    console.log('[Judit Consultar] Fazendo GET /responses/ (GRATUITO)...');
    
    const responseUrl = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`;
    console.log('[Judit Consultar] URL:', responseUrl);
    
    const response = await fetch(responseUrl, {
      method: 'GET',
      headers: {
        'api-key': juditApiKey.trim(),
        'Content-Type': 'application/json',
      },
    });

    console.log('[Judit Consultar] Status resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Judit Consultar] Erro na resposta:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao consultar Judit: ${response.status}`,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[Judit Consultar] Resposta recebida:', JSON.stringify(data).substring(0, 500));

    // Verificar se tem resultados - API retorna em page_data, nao results
    if (!data.page_data || data.page_data.length === 0) {
      console.log('[Judit Consultar] Nenhum resultado encontrado. Dados ainda processando ou request_id invalido.');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Nenhum resultado encontrado. O request pode ainda estar processando ou o ID esta incorreto.',
          rawResponse: data
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair processos dos resultados - API retorna em page_data
    const results = data.page_data || [];
    console.log('[Judit Consultar] Total de page_data:', results.length);

    // Processar cada resultado
    let processosInseridos = 0;
    let processosAtualizados = 0;

    for (const result of results) {
      const responseData = result.response_data || result;
      const lawsuits = responseData.lawsuits || responseData.processes || [];
      
      // Se nao for array, pode ser um processo unico
      const processosList = Array.isArray(lawsuits) ? lawsuits : [responseData];
      
      console.log('[Judit Consultar] Processos no result:', processosList.length);

      for (const processo of processosList) {
        const numeroCnj = processo.lawsuit_cnj || processo.numero_cnj || processo.number || '';
        
        if (!numeroCnj) {
          console.log('[Judit Consultar] Processo sem numero CNJ, pulando...');
          continue;
        }

        // Extrair partes
        let parteAtiva = '';
        let partePassiva = '';
        
        const partes = processo.parties || processo.partes || [];
        for (const parte of partes) {
          const nome = parte.name || parte.nome || '';
          const polo = (parte.pole || parte.polo || '').toLowerCase();
          const papel = (parte.role || parte.papel || '').toLowerCase();
          
          if (polo.includes('ativo') || papel.includes('autor') || papel.includes('requerente')) {
            parteAtiva = parteAtiva ? `${parteAtiva}, ${nome}` : nome;
          } else if (polo.includes('passivo') || papel.includes('reu') || papel.includes('requerido')) {
            partePassiva = partePassiva ? `${partePassiva}, ${nome}` : nome;
          }
        }

        // Preparar dados para upsert - usando colunas corretas da tabela processos_oab
        const processoData = {
          oab_id: oabId,
          numero_cnj: numeroCnj,
          tribunal: processo.court || processo.tribunal || null,
          tribunal_sigla: processo.court_acronym || processo.tribunal_sigla || null,
          parte_ativa: parteAtiva || null,
          parte_passiva: partePassiva || null,
          partes_completas: processo.parties || processo.partes || null,
          status_processual: processo.status || 'ativo',
          fase_processual: processo.phase || processo.fase || null,
          juizo: processo.court_name || processo.juizo || null,
          link_tribunal: processo.url || processo.link || null,
          capa_completa: processo,
          updated_at: new Date().toISOString(),
        };

        // Verificar se ja existe
        const { data: existente } = await supabase
          .from('processos_oab')
          .select('id')
          .eq('oab_id', oabId)
          .eq('numero_cnj', numeroCnj)
          .single();

        if (existente) {
          // Atualizar
          await supabase
            .from('processos_oab')
            .update(processoData)
            .eq('id', existente.id);
          processosAtualizados++;
        } else {
          // Inserir
          await supabase
            .from('processos_oab')
            .insert(processoData);
          processosInseridos++;
        }

        console.log('[Judit Consultar] Processado:', numeroCnj);
      }
    }

    // Atualizar OAB com request_id e contagem
    const { error: updateError } = await supabase
      .from('oabs_cadastradas')
      .update({
        ultimo_request_id: requestId,
        request_id_data: new Date().toISOString(),
        ultima_sincronizacao: new Date().toISOString(),
        total_processos: processosInseridos + processosAtualizados,
      })
      .eq('id', oabId);

    if (updateError) {
      console.error('[Judit Consultar] Erro ao atualizar OAB:', updateError);
    }

    console.log('[Judit Consultar] Concluido!');
    console.log('[Judit Consultar] Inseridos:', processosInseridos);
    console.log('[Judit Consultar] Atualizados:', processosAtualizados);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Consulta concluida com sucesso (GRATUITO)`,
        processosInseridos,
        processosAtualizados,
        totalProcessos: processosInseridos + processosAtualizados,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Consultar] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
