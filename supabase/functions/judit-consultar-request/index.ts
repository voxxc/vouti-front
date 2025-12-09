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
    // COM PAGINACAO COMPLETA - busca ate 50 paginas
    console.log('[Judit Consultar] Fazendo GET /responses/ (GRATUITO) com paginacao...');
    
    const maxPages = 50;
    let allPageData: any[] = [];
    let totalPages = 1;
    
    // Buscar primeira pagina
    const firstPageUrl = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`;
    console.log('[Judit Consultar] URL pagina 1:', firstPageUrl);
    
    const firstResponse = await fetch(firstPageUrl, {
      method: 'GET',
      headers: {
        'api-key': juditApiKey.trim(),
        'Content-Type': 'application/json',
      },
    });

    console.log('[Judit Consultar] Status resposta:', firstResponse.status);

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.error('[Judit Consultar] Erro na resposta:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao consultar Judit: ${firstResponse.status}`,
          details: errorText 
        }),
        { status: firstResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstData = await firstResponse.json();
    console.log('[Judit Consultar] Pagina 1 - count:', firstData.count, 'page_data:', firstData.page_data?.length || 0, 'total_pages:', firstData.total_pages || 1);

    // Verificar se tem resultados
    if (!firstData.page_data || firstData.page_data.length === 0) {
      console.log('[Judit Consultar] Nenhum resultado encontrado.');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Nenhum resultado encontrado. O request pode ainda estar processando ou o ID esta incorreto.',
          rawResponse: firstData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Coletar primeira pagina
    allPageData = firstData.page_data;
    totalPages = Math.min(firstData.total_pages || 1, maxPages);
    console.log(`[Judit Consultar] Pagina 1/${totalPages} - ${firstData.page_data.length} resultados`);

    // Buscar paginas adicionais se existirem
    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay entre paginas
      
      const pageUrl = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=${currentPage}&page_size=100`;
      console.log(`[Judit Consultar] Buscando pagina ${currentPage}...`);
      
      const pageResponse = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'api-key': juditApiKey.trim(),
          'Content-Type': 'application/json',
        },
      });

      if (pageResponse.ok) {
        const pageData = await pageResponse.json();
        if (pageData.page_data && pageData.page_data.length > 0) {
          allPageData = allPageData.concat(pageData.page_data);
          console.log(`[Judit Consultar] Pagina ${currentPage}/${totalPages} - ${pageData.page_data.length} resultados`);
        }
      } else {
        console.log(`[Judit Consultar] Erro ao buscar pagina ${currentPage}:`, pageResponse.status);
      }
    }

    console.log(`[Judit Consultar] Total de itens coletados: ${allPageData.length}`);

    // Processar cada resultado - cada item do page_data e um processo
    let processosInseridos = 0;
    let processosAtualizados = 0;

    for (const result of allPageData) {
      const responseData = result.response_data;
      
      if (!responseData) {
        console.log('[Judit Consultar] Item sem response_data, pulando...');
        continue;
      }

      // O numero CNJ esta em "code"
      const numeroCnj = responseData.code || '';
      
      if (!numeroCnj) {
        console.log('[Judit Consultar] Processo sem numero CNJ, pulando...');
        continue;
      }

      console.log('[Judit Consultar] Processando CNJ:', numeroCnj);

      // Processar parties de forma mais precisa usando person_type
      let parteAtiva = '';
      let partePassiva = '';
      const advogados: string[] = [];

      if (responseData.parties && responseData.parties.length > 0) {
        for (const parte of responseData.parties) {
          const nome = parte.name || '';
          const tipo = (parte.person_type || '').toUpperCase();
          
          if (tipo === 'ATIVO' || tipo === 'AUTOR') {
            if (!parteAtiva) parteAtiva = nome;
          } else if (tipo === 'PASSIVO' || tipo === 'REU' || tipo === 'RÉU') {
            if (!partePassiva) partePassiva = nome;
          } else if (tipo === 'ADVOGADO') {
            const oabDoc = parte.documents?.find((d: { document_type?: string }) => 
              d.document_type?.toLowerCase() === 'oab'
            );
            const oabNum = oabDoc?.document || '';
            const advStr = oabNum ? `${nome} (OAB ${oabNum})` : nome;
            if (!advogados.includes(advStr)) {
              advogados.push(advStr);
            }
          }
          
          // Tambem extrair advogados que estao como lawyers dentro de cada parte
          if (parte.lawyers && parte.lawyers.length > 0) {
            for (const advogado of parte.lawyers) {
              const advNome = advogado.name || '';
              const oabDoc = advogado.documents?.find((d: { document_type?: string }) => 
                d.document_type?.toLowerCase() === 'oab'
              );
              const oabNum = oabDoc?.document || '';
              const advStr = oabNum ? `${advNome} (OAB ${oabNum})` : advNome;
              if (advStr && !advogados.includes(advStr)) {
                advogados.push(advStr);
              }
            }
          }
        }
      }

      // Fallback para o campo name se parties nao tiver dados de autor/reu
      if (!parteAtiva && !partePassiva && responseData.name && responseData.name.includes(' X ')) {
        const partesNome = responseData.name.split(' X ');
        parteAtiva = partesNome[0]?.trim() || '';
        partePassiva = partesNome[1]?.trim() || '';
      }

      // Extrair tribunal do array courts
      const tribunal = responseData.courts?.[0]?.name || null;
      const tribunalSigla = responseData.courts?.[0]?.acronym || null;

      // Extrair link do tribunal
      let linkTribunal = null;
      if (responseData.tribunal_url && responseData.tribunal_url !== 'NAO INFORMADO') {
        linkTribunal = responseData.tribunal_url;
      } else if (responseData.url) {
        linkTribunal = responseData.url;
      }

      // Extrair data de distribuicao
      let dataDistribuicao = null;
      if (responseData.distribution_date) {
        try {
          dataDistribuicao = responseData.distribution_date.split('T')[0];
        } catch {
          dataDistribuicao = null;
        }
      }

      // Preparar dados para upsert com todos os campos
      const processoData = {
        oab_id: oabId,
        numero_cnj: numeroCnj,
        tribunal: tribunal,
        tribunal_sigla: tribunalSigla,
        parte_ativa: parteAtiva || null,
        parte_passiva: partePassiva || null,
        partes_completas: responseData.parties || null,
        status_processual: responseData.situation || responseData.status || 'ativo',
        fase_processual: responseData.phase || null,
        juizo: responseData.county || responseData.courts?.[0]?.name || tribunal,
        link_tribunal: linkTribunal,
        valor_causa: responseData.amount || null,
        data_distribuicao: dataDistribuicao,
        capa_completa: responseData,
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
        const { error: updateError } = await supabase
          .from('processos_oab')
          .update(processoData)
          .eq('id', existente.id);
        
        if (updateError) {
          console.error('[Judit Consultar] Erro ao atualizar:', updateError);
        } else {
          processosAtualizados++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('processos_oab')
          .insert(processoData);
        
        if (insertError) {
          console.error('[Judit Consultar] Erro ao inserir:', insertError);
        } else {
          processosInseridos++;
        }
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
    console.log('[Judit Consultar] Total coletado:', allPageData.length);
    console.log('[Judit Consultar] Inseridos:', processosInseridos);
    console.log('[Judit Consultar] Atualizados:', processosAtualizados);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Consulta concluida com sucesso (GRATUITO)`,
        processosInseridos,
        processosAtualizados,
        totalProcessos: processosInseridos + processosAtualizados,
        paginasProcessadas: totalPages,
        totalItensColetados: allPageData.length,
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
