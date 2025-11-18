import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Judit Health] 🏥 Iniciando health check');
    
    // Validar e sanitizar API Key
    const rawApiKey = Deno.env.get('JUDIT_API_KEY') ?? '';
    const JUDIT_API_KEY = rawApiKey
      .trim()
      .replace(/^api[-_\s]*key[\s:]+/i, '')
      .trim();
    
    if (!JUDIT_API_KEY) {
      console.error('[Judit Health] ❌ API Key não configurada');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          status: 500,
          message: 'JUDIT_API_KEY não configurada',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar formato UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(JUDIT_API_KEY)) {
      console.error('[Judit Health] ⚠️ API Key com formato inválido');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          status: 500,
          message: 'JUDIT_API_KEY com formato inválido',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer requisição simples à Judit para validar conectividade
    console.log('[Judit Health] 🌐 Testando conectividade com a Judit API');
    
    const response = await fetch('https://requests.prod.judit.io/requests', {
      method: 'GET',
      headers: {
        'api-key': JUDIT_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const responseOk = response.ok;
    const responseStatus = response.status;
    
    console.log(`[Judit Health] 📊 Status da Judit: ${responseStatus}`);

    if (responseOk || responseStatus === 200) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          status: responseStatus,
          message: 'Judit API está operacional',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não for 200, mas também não for 401, consideramos instável
    if (responseStatus === 401) {
      console.error('[Judit Health] 🔒 Erro de autenticação');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          status: responseStatus,
          message: 'Erro de autenticação - verifique a API Key',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Qualquer outro status (500, 503, etc.)
    return new Response(
      JSON.stringify({ 
        ok: false, 
        status: responseStatus,
        message: `Judit API instável (HTTP ${responseStatus})`,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Health] 💥 ERRO:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        status: 0,
        message: error.message || 'Erro ao conectar com a Judit API',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
