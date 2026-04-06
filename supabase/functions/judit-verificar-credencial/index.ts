import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    if (!JUDIT_API_KEY) {
      throw new Error('JUDIT_API_KEY não configurada');
    }

    const { customerKey } = await req.json();

    if (!customerKey) {
      return new Response(
        JSON.stringify({ error: 'customerKey é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verificando credenciais para customer_key=${customerKey}`);

    const response = await fetch(`https://crawler.prod.judit.io/credentials?customer_key=${encodeURIComponent(customerKey)}`, {
      method: 'GET',
      headers: {
        'api-key': JUDIT_API_KEY,
      },
    });

    const responseText = await response.text();
    console.log(`Resposta Judit: status=${response.status}, body=${responseText}`);

    if (!response.ok) {
      throw new Error(`Erro na API Judit: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao verificar credencial:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
