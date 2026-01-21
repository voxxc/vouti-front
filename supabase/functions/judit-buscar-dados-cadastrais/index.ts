import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuscaCadastralRequest {
  search_type: 'cpf' | 'cnpj' | 'name';
  search_key: string;
  on_demand?: boolean;
  reveal_partners_documents?: boolean;
  enrich_name_results?: boolean; // Buscar detalhes completos para resultados de nome
}

// Função auxiliar para buscar detalhes de uma entidade por documento
async function fetchEntityDetails(
  apiKey: string,
  docType: 'cpf' | 'cnpj',
  document: string
): Promise<any> {
  // Formatar documento
  const digits = document.replace(/\D/g, '');
  let formattedDoc = document;
  
  if (docType === 'cpf' && digits.length === 11) {
    formattedDoc = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  } else if (docType === 'cnpj' && digits.length === 14) {
    formattedDoc = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  }

  const payload = {
    search: {
      search_type: docType,
      search_key: formattedDoc,
      on_demand: true
    }
  };

  console.log(`[Busca Cadastral] Enriquecendo ${docType}: ${formattedDoc.substring(0, 5)}***`);

  const response = await fetch('https://requests.prod.judit.io/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.response_data) {
    return data.response_data;
  }

  // Fazer polling se necessário
  if (data.request_id) {
    const maxAttempts = 5;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const pollUrl = `https://requests.prod.judit.io/responses?request_id=${data.request_id}&page=1&page_size=100`;
      const pollResponse = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'api-key': apiKey },
      });
      
      const pollData = await pollResponse.json();
      
      if (pollData.page_data && pollData.page_data.length > 0) {
        const firstResult = pollData.page_data[0];
        return firstResult.response_data || firstResult;
      }
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    if (!JUDIT_API_KEY) {
      console.error('JUDIT_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração da API não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BuscaCadastralRequest = await req.json();
    const { 
      search_type, 
      search_key, 
      on_demand = true, 
      reveal_partners_documents = false,
      enrich_name_results = true // Por padrão, enriquecer resultados de nome
    } = body;

    console.log('[Busca Cadastral] Iniciando busca:', { search_type, search_key: search_key.substring(0, 5) + '***' });

    if (!search_type || !search_key) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros search_type e search_key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar search_key baseado no tipo (API Judit espera CPF/CNPJ COM pontuação)
    let formattedSearchKey = search_key.trim();
    if (search_type === 'cpf') {
      const digits = search_key.replace(/\D/g, '');
      if (digits.length !== 11) {
        return new Response(
          JSON.stringify({ error: 'CPF deve conter 11 dígitos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Formatar: XXX.XXX.XXX-XX
      formattedSearchKey = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
    } else if (search_type === 'cnpj') {
      const digits = search_key.replace(/\D/g, '');
      if (digits.length !== 14) {
        return new Response(
          JSON.stringify({ error: 'CNPJ deve conter 14 dígitos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Formatar: XX.XXX.XXX/XXXX-XX
      formattedSearchKey = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
    } else if (search_type === 'name') {
      if (formattedSearchKey.length < 3) {
        return new Response(
          JSON.stringify({ error: 'Nome deve ter pelo menos 3 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Montar payload para API Judit
    const payload: any = {
      search: {
        search_type,
        search_key: formattedSearchKey,
      }
    };

    // response_type só é válido para CPF/CNPJ, não para nome
    if (search_type !== 'name') {
      payload.search.response_type = 'entity';
    }

    // Adicionar opções extras (padrão da API funcional usa underscore)
    if (on_demand) {
      payload.search.on_demand = true;
    }
    if (search_type === 'cnpj' && reveal_partners_documents) {
      payload.search.reveal_partners_documents = true;
    }

    console.log('[Busca Cadastral] Payload para Judit:', JSON.stringify(payload));

    // Fazer requisição para API Judit (seguindo padrão da função que funciona)
    const juditResponse = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': JUDIT_API_KEY.trim(),
      },
      body: JSON.stringify(payload),
    });

    const juditData = await juditResponse.json();
    console.log('[Busca Cadastral] Resposta Judit status:', juditResponse.status);

    if (!juditResponse.ok) {
      console.error('[Busca Cadastral] Erro Judit:', juditData);
      return new Response(
        JSON.stringify({ 
          error: juditData.message || 'Erro na API Judit',
          details: juditData 
        }),
        { status: juditResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a resposta contém dados
    if (juditData.response_data) {
      console.log('[Busca Cadastral] Dados encontrados');
      
      let finalData = juditData.response_data;
      
      // Se for busca por nome e enriquecimento ativo, buscar detalhes de cada resultado
      if (search_type === 'name' && enrich_name_results && Array.isArray(finalData)) {
        console.log(`[Busca Cadastral] Enriquecendo ${finalData.length} resultados de nome`);
        
        const enrichedResults = [];
        for (const entity of finalData) {
          if (entity.main_document) {
            const docType = entity.entity_type === 'company' ? 'cnpj' : 'cpf';
            const detailedData = await fetchEntityDetails(JUDIT_API_KEY.trim(), docType, entity.main_document);
            
            if (detailedData) {
              // Se retornou array, pegar primeiro item
              const enriched = Array.isArray(detailedData) ? detailedData[0] : detailedData;
              enrichedResults.push(enriched);
            } else {
              enrichedResults.push(entity); // Fallback para dados originais
            }
          } else {
            enrichedResults.push(entity);
          }
        }
        
        finalData = enrichedResults;
        console.log(`[Busca Cadastral] Enriquecimento concluído: ${enrichedResults.length} resultados`);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          data: finalData,
          request_id: juditData.request_id,
          status: juditData.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não houver response_data mas a requisição foi criada
    if (juditData.request_id) {
      console.log('[Busca Cadastral] Requisição criada, aguardando processamento:', juditData.request_id);
      
      // Tentar polling para obter resultado (máximo 30 segundos)
      const maxAttempts = 10;
      const delayMs = 3000;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[Busca Cadastral] Polling tentativa ${attempt}/${maxAttempts}`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        const pollUrl = `https://requests.prod.judit.io/responses?request_id=${juditData.request_id}&page=1&page_size=100`;
        const pollResponse = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'api-key': JUDIT_API_KEY.trim(),
          },
        });
        
        const pollData = await pollResponse.json();
        console.log(`[Busca Cadastral] Polling resposta - page_data: ${pollData.page_data?.length || 0}`);
        
        if (pollData.page_data && pollData.page_data.length > 0) {
          let responseData;
          
          // Para busca por nome, cada item do page_data é uma entidade diferente
          if (search_type === 'name') {
            responseData = pollData.page_data.map((item: any) => item.response_data || item);
            console.log(`[Busca Cadastral] ${responseData.length} resultados encontrados para busca por nome`);
          } else {
            // Para CPF/CNPJ, o response_data está no primeiro item
            const firstResult = pollData.page_data[0];
            responseData = firstResult.response_data || firstResult;
          }
          
          console.log('[Busca Cadastral] Dados obtidos após polling');
          
          // Se for busca por nome e enriquecimento ativo, buscar detalhes (limitar a 5 para evitar timeout)
          if (search_type === 'name' && enrich_name_results && Array.isArray(responseData) && responseData.length > 0) {
            const maxEnrich = 5;
            const toEnrich = responseData.slice(0, maxEnrich);
            const remaining = responseData.slice(maxEnrich);
            
            console.log(`[Busca Cadastral] Enriquecendo ${toEnrich.length} de ${responseData.length} resultados de nome`);
            
            const enrichedResults = [];
            for (const entity of toEnrich) {
              const doc = entity.main_document || entity.document || entity.cpf || entity.cnpj;
              if (doc) {
                const isCompany = entity.entity_type === 'company' || entity.type === 'company' || !!entity.cnpj;
                const docType = isCompany ? 'cnpj' : 'cpf';
                const detailedData = await fetchEntityDetails(JUDIT_API_KEY.trim(), docType, doc);
                
                if (detailedData) {
                  const enriched = Array.isArray(detailedData) ? detailedData[0] : detailedData;
                  enrichedResults.push(enriched);
                } else {
                  enrichedResults.push(entity);
                }
              } else {
                enrichedResults.push(entity);
              }
            }
            
            // Combinar enriquecidos + restantes não enriquecidos
            responseData = [...enrichedResults, ...remaining];
            console.log(`[Busca Cadastral] Enriquecimento concluído: ${enrichedResults.length} enriquecidos, ${remaining.length} básicos`);
          }
          
          return new Response(
            JSON.stringify({ 
              success: true,
              data: responseData,
              request_id: juditData.request_id,
              status: 'done'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (pollData.error) {
          console.error('[Busca Cadastral] Erro no processamento:', pollData);
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao processar busca',
              details: pollData 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Timeout - retornar request_id para consulta posterior
      return new Response(
        JSON.stringify({ 
          success: true,
          pending: true,
          message: 'Busca em processamento. Tente novamente em alguns segundos.',
          request_id: juditData.request_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Resposta inesperada da API',
        details: juditData 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Busca Cadastral] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
