import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUDIT_API_URL = 'https://requests.prod.judit.io';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');

    if (!juditApiKey) {
      return new Response(
        JSON.stringify({ error: 'JUDIT_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente com service role para verificar super_admins
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extrair user_id do token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é Super Admin
    const { data: superAdmin, error: saError } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (saError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas Super Admins podem usar esta função' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter parâmetros
    const { numeroCnj, withAttachments = false } = await req.json();

    if (!numeroCnj) {
      return new Response(
        JSON.stringify({ error: 'Número CNJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar número CNJ
    const numeroLimpo = numeroCnj.replace(/[^\d.-]/g, '').trim();
    console.log(`[judit-test-import-cnj] Testando CNJ: ${numeroLimpo}, withAttachments: ${withAttachments}`);

    // Fazer chamada para a API Judit
    const requestPayload = {
      search: {
        search_type: 'lawsuit_cnj',
        search_key: numeroLimpo,
        on_demand: true
      },
      with_attachments: withAttachments
    };

    console.log('[judit-test-import-cnj] Payload:', JSON.stringify(requestPayload));

    const requestResponse = await fetch(`${JUDIT_API_URL}/requests`, {
      method: 'POST',
      headers: {
        'api-key': juditApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!requestResponse.ok) {
      const errorText = await requestResponse.text();
      console.error('[judit-test-import-cnj] Erro na requisição:', errorText);
      
      // Registrar log de erro
      await supabaseAdmin.from('judit_api_logs').insert({
        endpoint: '/requests',
        metodo: 'POST',
        tipo_chamada: 'test_import_cnj',
        request_payload: requestPayload,
        resposta_status: requestResponse.status,
        sucesso: false,
        erro_mensagem: errorText,
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({ 
          error: 'Erro na chamada à API Judit', 
          status: requestResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await requestResponse.json();
    const requestId = requestData.request_id;
    console.log('[judit-test-import-cnj] Request ID:', requestId);

    // Polling para obter resposta
    let lawsuitData = null;
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 3000; // 3 segundos

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[judit-test-import-cnj] Polling tentativa ${attempts}/${maxAttempts}`);
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const responseCheck = await fetch(`${JUDIT_API_URL}/responses?request_id=${requestId}`, {
        method: 'GET',
        headers: {
          'api-key': juditApiKey,
        },
      });

      if (responseCheck.ok) {
        const responseData = await responseCheck.json();
        
        if (responseData.status === 'done' || responseData.status === 'completed') {
          lawsuitData = responseData;
          console.log('[judit-test-import-cnj] Dados recebidos com sucesso');
          break;
        } else if (responseData.status === 'error' || responseData.status === 'failed') {
          console.error('[judit-test-import-cnj] Erro na busca:', responseData);
          
          await supabaseAdmin.from('judit_api_logs').insert({
            endpoint: '/responses',
            metodo: 'GET',
            tipo_chamada: 'test_import_cnj',
            request_id: requestId,
            resposta_status: 200,
            sucesso: false,
            erro_mensagem: responseData.error_message || 'Erro desconhecido',
            user_id: user.id,
          });

          return new Response(
            JSON.stringify({ 
              error: 'Erro ao buscar processo', 
              details: responseData 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Se ainda está processando, continua o polling
        console.log(`[judit-test-import-cnj] Status: ${responseData.status}, aguardando...`);
      }
    }

    if (!lawsuitData) {
      await supabaseAdmin.from('judit_api_logs').insert({
        endpoint: '/responses',
        metodo: 'GET',
        tipo_chamada: 'test_import_cnj',
        request_id: requestId,
        sucesso: false,
        erro_mensagem: 'Timeout: resposta não recebida após polling',
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({ 
          error: 'Timeout aguardando resposta da Judit',
          request_id: requestId,
          message: 'O processo pode ainda estar sendo processado. Tente novamente em alguns segundos.'
        }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar log de sucesso
    await supabaseAdmin.from('judit_api_logs').insert({
      endpoint: '/responses',
      metodo: 'GET',
      tipo_chamada: 'test_import_cnj',
      request_id: requestId,
      request_payload: requestPayload,
      resposta_status: 200,
      sucesso: true,
      user_id: user.id,
    });

    // Extrair informações relevantes para exibição
    const lawsuit = lawsuitData.payload?.response_data || lawsuitData.response_data || lawsuitData;
    const attachments = lawsuit.attachments || [];
    
    // Resumo para exibição
    const summary = {
      request_id: requestId,
      with_attachments_requested: withAttachments,
      numero_cnj: lawsuit.lawsuit_cnj || lawsuit.numero_cnj || numeroLimpo,
      tribunal: lawsuit.court?.name || lawsuit.tribunal || 'Não identificado',
      classe: lawsuit.subject?.name || lawsuit.classe || 'Não identificada',
      partes: {
        polo_ativo: lawsuit.parties?.filter((p: any) => p.pole === 'active' || p.polo === 'ativo') || [],
        polo_passivo: lawsuit.parties?.filter((p: any) => p.pole === 'passive' || p.polo === 'passivo') || [],
      },
      attachments_count: attachments.length,
      attachments: attachments.map((a: any) => ({
        attachment_id: a.attachment_id || a.id,
        name: a.name || a.nome || 'Sem nome',
        status: a.status || 'unknown',
        mime_type: a.mime_type || a.content_type,
        size: a.size,
        download_url: a.download_url || a.url,
      })),
      raw_response: lawsuitData,
    };

    console.log(`[judit-test-import-cnj] Teste concluído. Anexos encontrados: ${attachments.length}`);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judit-test-import-cnj] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
