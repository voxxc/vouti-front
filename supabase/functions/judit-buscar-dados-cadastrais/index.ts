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
    const { search_type, search_key, on_demand = true, reveal_partners_documents = false } = body;

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
        response_type: 'entity',
      }
    };

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
      return new Response(
        JSON.stringify({ 
          success: true,
          data: juditData.response_data,
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
          const firstResult = pollData.page_data[0];
          const responseData = firstResult.response_data || firstResult;
          console.log('[Busca Cadastral] Dados obtidos após polling');
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
