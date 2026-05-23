import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// INVARIANTE: Esta função realiza apenas snapshot inicial via /requests (search_type='oab').
// NUNCA criar tracking nem enviar `with_attachments: true` aqui.
// Anexos são opt-in e só devem ser solicitados na ativação manual do monitoramento
// (judit-ativar-monitoramento*). Cadastrar OAB jamais consome cota de anexos da Judit.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Judit OAB] 🔍 Iniciando busca por OAB');
    
    const { oabNumero, oabUf } = await req.json();
    
    // Validação
    if (!oabNumero || !oabUf) {
      console.error('[Judit OAB] ❌ Validação falhou:', { oabNumero, oabUf });
      return new Response(
        JSON.stringify({ error: 'OAB e UF são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pegar user_id do token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remover caracteres especiais e formatar search_key (SEM prefixo "OAB")
    const numeroLimpo = oabNumero.replace(/\D/g, '');
    const ufUpper = oabUf.toUpperCase();
    const searchKey = `${numeroLimpo}${ufUpper}`;
    
    console.log('[Judit OAB] 📝 Search key:', searchKey);

    // Validar e sanitizar API Key
    const rawApiKey = Deno.env.get('JUDIT_API_KEY') ?? '';
    const JUDIT_API_KEY = rawApiKey
      .trim()
      .replace(/^api[-_\s]*key[\s:]+/i, '') // Remove "API-KEY ", "api_key:", etc.
      .trim();
    
    if (!JUDIT_API_KEY) {
      console.error('[Judit OAB] ❌ API Key não configurada');
      throw new Error('JUDIT_API_KEY não configurada');
    }
    
    // Validar formato UUID (básico)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(JUDIT_API_KEY)) {
      console.error('[Judit OAB] ⚠️ API Key não parece ser um UUID válido. Primeiros 20 chars:', JUDIT_API_KEY.substring(0, 20));
      throw new Error('❌ JUDIT_API_KEY com formato inválido. Verifique se é um UUID puro sem prefixos.');
    }
    
    console.log('[Judit OAB] 🔑 API Key sanitizada e validada (UUID)');
    
    // Função auxiliar para fazer a requisição com retry
    const makeJuditRequest = async (attempt: number, payloadVariant: string) => {
      let requestPayload: any;
      
      // Definir variantes de payload para retry
      switch (payloadVariant) {
        case 'default':
          requestPayload = {
            search_type: 'oab',
            search_key: searchKey,
            search_params: {
              on_demand: true,
              masked_response: false
            }
          };
          break;
        case 'masked':
          requestPayload = {
            search_type: 'oab',
            search_key: searchKey,
            search_params: {
              on_demand: true,
              masked_response: true
            }
          };
          break;
        case 'no_ondemand':
          requestPayload = {
            search_type: 'oab',
            search_key: searchKey,
            search_params: {
              masked_response: false
            }
          };
          break;
        default:
          requestPayload = {
            search_type: 'oab',
            search_key: searchKey
          };
      }
      
      console.log(`[Judit OAB] 📡 Tentativa ${attempt} com variante '${payloadVariant}'`);
      console.log(`[Judit OAB] 📤 Payload:`, JSON.stringify(requestPayload, null, 2));
      
      const response = await fetch('https://requests.prod.judit.io/requests', {
        method: 'POST',
        headers: {
          'api-key': JUDIT_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });
      
      return { response, payloadVariant };
    };
    
    // Tentar com diferentes variantes de payload
    const variants = ['default', 'masked', 'no_ondemand', 'minimal'];
    let juditResponse: Response | null = null;
    let successVariant: string = '';
    let lastError: any = null;
    const retryAttempts: Array<{ variant: string; status: number }> = [];
    
    for (let i = 0; i < variants.length; i++) {
      try {
        const { response, payloadVariant } = await makeJuditRequest(i + 1, variants[i]);
        
        retryAttempts.push({ variant: payloadVariant, status: response.status });
        
        if (response.ok) {
          juditResponse = response;
          successVariant = payloadVariant;
          console.log(`[Judit OAB] ✅ Sucesso com variante '${payloadVariant}'`);
          break;
        } else {
          const errorText = await response.text();
          console.error(`[Judit OAB] ⚠️ Tentativa ${i + 1} falhou (${response.status}):`, errorText);
          lastError = { status: response.status, text: errorText };
          
          // Se for 401, não tentar outras variantes
          if (response.status === 401) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error?.data === 'USER_NOT_FOUND') {
                throw new Error('❌ API Key inválida. Verifique a chave JUDIT_API_KEY no Supabase.');
              }
            } catch (e) {
              if (e instanceof Error && e.message.includes('API Key inválida')) throw e;
            }
            throw new Error('❌ Não autorizado. Verifique a API Key da Judit.');
          }
          
          // Aguardar 2 segundos antes da próxima tentativa (exceto na última)
          if (i < variants.length - 1) {
            console.log(`[Judit OAB] ⏳ Aguardando 2s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`[Judit OAB] 💥 Erro na tentativa ${i + 1}:`, error);
        lastError = error;
      }
    }
    
    // Se todas as tentativas falharam com 500, retornar 200 com success: false
    if (!juditResponse) {
      console.error('[Judit OAB] 💥 Todas as tentativas falharam');
      
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'judit_internal_error',
          error: 'Serviço da Judit retornou INTERNAL_SERVER_ERROR em todas as tentativas',
          upstream_status: lastError?.status || 500,
          attempts: retryAttempts,
          oab: { numero: numeroLimpo, uf: ufUpper }
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-upstream-status': String(lastError?.status || 500)
          } 
        }
      );
    }

    const initialData = await juditResponse.json();
    const requestId = initialData.request_id;
    
    console.log('[Judit OAB] ✅ Request criado:', requestId);
    console.log('[Judit OAB] 📋 Variante de payload usada:', successVariant);
    console.log('[Judit OAB] ⏳ Aguardando processamento (até 60 segundos)...');

    // Polling para obter resultado (até 60 segundos)
    let responseData: any = null;
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 segundos

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      console.log(`[Judit OAB] 🔄 Tentativa ${i + 1}/${maxAttempts}`);
      
      const statusResponse = await fetch(
        `https://requests.prod.judit.io/requests/${requestId}`,
        {
          headers: { 'api-key': JUDIT_API_KEY }
        }
      );

      if (!statusResponse.ok) {
        console.error('[Judit OAB] ❌ Erro ao verificar status');
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`[Judit OAB] Status: ${statusData.status}`);
      
      if (statusData.status === 'completed') {
        responseData = statusData.response_data;
        console.log('[Judit OAB] ✅ Processamento completo!');
        break;
      } else if (statusData.status === 'error') {
        console.error('[Judit OAB] ❌ Processamento falhou. Request ID:', requestId);
        throw new Error(`API Judit retornou erro no processamento (Request ID: ${requestId})`);
      }
    }

    if (!responseData) {
      console.error('[Judit OAB] ⏱️ Timeout. Request ID:', requestId);
      throw new Error(`Timeout: API Judit não respondeu em 60 segundos (Request ID: ${requestId}). Tente novamente em alguns minutos.`);
    }

    // Processar resultados
    const lawsuits = responseData.lawsuits || [];
    console.log(`[Judit OAB] 📊 Total processos encontrados: ${lawsuits.length}`);

    // Processar resultados com mapeamento completo
    const processos = lawsuits.map((lawsuit: any) => {
      // Extrair partes do processo
      const partes = lawsuit.parties?.map((party: any) => ({
        nome: party.name || '',
        tipo: party.type || '',
        papel: party.role || party.party_type,
        principal: party.is_main_party || false
      })) || [];

      // Extrair todos os andamentos (não apenas os últimos 5)
      const andamentos = (lawsuit.steps || []).reverse().map((step: any) => ({
        data_movimentacao: step.date || step.step_date,
        tipo_movimentacao: step.type || step.step_type,
        descricao: step.description || step.step_description || '',
        dados_completos: step
      }));

      return {
        numero_cnj: lawsuit.code || lawsuit.lawsuit_code || '',
        tribunal: lawsuit.tribunal_name || lawsuit.tribunal_acronym || '',
        tribunal_acronym: lawsuit.tribunal_acronym || '',
        parte_tipo: lawsuit.party_type || 'advogado',
        status_processual: lawsuit.status || 'Ativo',
        fase_processual: lawsuit.phase || lawsuit.lawsuit_phase,
        data_distribuicao: lawsuit.distribution_date || lawsuit.lawsuit_distribution_date,
        data_criacao: lawsuit.created_at || lawsuit.lawsuit_created_at,
        valor_causa: lawsuit.value || lawsuit.lawsuit_value,
        valor_condenacao: lawsuit.condemnation_value,
        juizo: lawsuit.court || lawsuit.lawsuit_court,
        link_tribunal: lawsuit.lawsuit_url || lawsuit.url,
        acao: lawsuit.lawsuit_type || lawsuit.class || lawsuit.lawsuit_class,
        partes: partes,
        ultimos_andamentos: andamentos,
        dados_completos: lawsuit
      };
    });

    // Salvar histórico da busca
    console.log('[Judit OAB] 💾 Salvando histórico...');
    
    const { error: insertError } = await supabaseClient
      .from('busca_processos_oab')
      .insert({
        oab_numero: numeroLimpo,
        oab_uf: ufUpper,
        user_id: user.id,
        total_processos_encontrados: processos.length,
        resultado_completo: responseData
      });

    if (insertError) {
      console.error('[Judit OAB] ⚠️ Erro ao salvar histórico:', insertError);
      // Não falhar a request por causa disso
    } else {
      console.log('[Judit OAB] ✅ Histórico salvo');
    }

    // Retornar resultados
    console.log('[Judit OAB] 🎉 Busca concluída com sucesso!');
    
    console.log(`[Judit OAB] 🎉 Busca finalizada com sucesso! ${processos.length} processos retornados.`);
    
    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        payloadVariant: successVariant,
        totalProcessos: processos.length,
        processos,
        oab: { numero: numeroLimpo, uf: ufUpper }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Judit OAB] 💥 ERRO:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao buscar processos',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
