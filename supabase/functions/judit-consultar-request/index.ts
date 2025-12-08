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

    // Processar cada resultado - cada item do page_data e um processo
    let processosInseridos = 0;
    let processosAtualizados = 0;

    for (const result of results) {
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

      // Extrair partes do campo "name" (formato "AUTOR X REU")
      let parteAtiva = '';
      let partePassiva = '';
      
      if (responseData.name && responseData.name.includes(' X ')) {
        const partesNome = responseData.name.split(' X ');
        parteAtiva = partesNome[0]?.trim() || '';
        partePassiva = partesNome[1]?.trim() || '';
      } else if (responseData.name) {
        parteAtiva = responseData.name;
      }

      // Se tiver array parties, usar para mais detalhes
      if (responseData.parties && responseData.parties.length > 0) {
        for (const parte of responseData.parties) {
          const nome = parte.name || '';
          const polo = (parte.pole || parte.side || '').toLowerCase();
          
          if (polo.includes('active') || polo.includes('ativo')) {
            parteAtiva = parteAtiva || nome;
          } else if (polo.includes('passive') || polo.includes('passivo')) {
            partePassiva = partePassiva || nome;
          }
        }
      }

      // Extrair tribunal do array courts
      const tribunal = responseData.courts?.[0]?.name || null;
      const tribunalSigla = responseData.courts?.[0]?.acronym || null;

      // Preparar dados para upsert
      const processoData = {
        oab_id: oabId,
        numero_cnj: numeroCnj,
        tribunal: tribunal,
        tribunal_sigla: tribunalSigla,
        parte_ativa: parteAtiva || null,
        parte_passiva: partePassiva || null,
        partes_completas: responseData.parties || null,
        status_processual: responseData.status || 'ativo',
        fase_processual: responseData.phase || null,
        juizo: tribunal,
        link_tribunal: responseData.url || null,
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
        await supabase
          .from('processos_oab')
          .update(processoData)
          .eq('id', existente.id);
        processosAtualizados++;
      } else {
        await supabase
          .from('processos_oab')
          .insert(processoData);
        processosInseridos++;
      }

      console.log('[Judit Consultar] Processado:', numeroCnj);
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
