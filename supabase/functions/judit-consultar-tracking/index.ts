import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client para validar JWT do usuário
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client com service role para bypassar RLS (Super Admin precisa ver todos os tenants)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verificar JWT e se é super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verificar se é super admin (usando service role para evitar RLS)
    const { data: superAdmin, error: saError } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (saError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a Super Admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter parâmetros
    const { trackingId, numeroCnj } = await req.json();

    if (!trackingId && !numeroCnj) {
      return new Response(
        JSON.stringify({ error: 'Informe tracking_id ou numero_cnj' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let trackingIdToQuery = trackingId;
    let processoInfo = null;

    // Se foi fornecido CNJ, buscar o tracking_id no banco (usando service role para ver todos os tenants)
    if (numeroCnj && !trackingId) {
      const { data: processo, error: processoError } = await supabaseAdmin
        .from('processos_oab')
        .select('id, numero_cnj, tracking_id, detalhes_request_id, monitoramento_ativo, tenant_id')
        .eq('numero_cnj', numeroCnj)
        .eq('monitoramento_ativo', true)
        .limit(1)
        .maybeSingle();

      if (processoError) {
        return new Response(
          JSON.stringify({ error: `Erro ao buscar processo: ${processoError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!processo) {
        return new Response(
          JSON.stringify({ 
            error: 'Processo não encontrado ou sem monitoramento ativo',
            numero_cnj: numeroCnj 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!processo.tracking_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Processo não possui tracking_id cadastrado',
            numero_cnj: numeroCnj,
            processo_id: processo.id
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      trackingIdToQuery = processo.tracking_id;
      processoInfo = {
        processo_id: processo.id,
        numero_cnj: processo.numero_cnj,
        detalhes_request_id_banco: processo.detalhes_request_id,
        monitoramento_ativo: processo.monitoramento_ativo,
        tenant_id: processo.tenant_id,
      };
    }

    // Consultar a API Judit
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');
    if (!juditApiKey) {
      return new Response(
        JSON.stringify({ error: 'JUDIT_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[judit-consultar-tracking] Consultando tracking_id: ${trackingIdToQuery}`);

    const juditResponse = await fetch(
      `https://tracking.prod.judit.io/tracking/${trackingIdToQuery}`,
      {
        method: 'GET',
        headers: {
          'api-key': juditApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const juditData = await juditResponse.json();

    if (!juditResponse.ok) {
      console.error(`[judit-consultar-tracking] Erro da Judit:`, juditData);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro da API Judit: ${juditResponse.status}`,
          tracking_id: trackingIdToQuery,
          judit_error: juditData,
          processo_info: processoInfo,
        }),
        { status: juditResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair request_id atual da resposta
    let requestIdAtual = null;
    let pageData = null;

    if (juditData.page_data && Array.isArray(juditData.page_data) && juditData.page_data.length > 0) {
      pageData = juditData.page_data;
      // O request_id mais recente geralmente é o último ou o primeiro dependendo da ordenação
      // Vamos pegar o mais recente baseado no created_at
      const sortedPageData = [...pageData].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      requestIdAtual = sortedPageData[0]?.request_id || null;
    }

    // Comparar com o banco se temos processoInfo
    let comparacao = null;
    if (processoInfo) {
      const requestIdBanco = processoInfo.detalhes_request_id_banco;
      comparacao = {
        request_id_judit: requestIdAtual,
        request_id_banco: requestIdBanco,
        sao_diferentes: requestIdAtual !== requestIdBanco,
        status: requestIdAtual !== requestIdBanco 
          ? 'NOVO REQUEST ID DISPONÍVEL' 
          : 'MESMO REQUEST ID',
      };
    }

    console.log(`[judit-consultar-tracking] Sucesso. Request ID atual: ${requestIdAtual}`);

    return new Response(
      JSON.stringify({
        success: true,
        tracking_id: trackingIdToQuery,
        request_id_atual: requestIdAtual,
        processo_info: processoInfo,
        comparacao,
        raw_response: juditData,
        consultado_em: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judit-consultar-tracking] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
