import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    
    if (!JUDIT_API_KEY) {
      throw new Error('JUDIT_API_KEY não configurada');
    }

    const { systemName, customerKey } = await req.json();

    if (!systemName || !customerKey) {
      return new Response(
        JSON.stringify({ error: 'systemName e customerKey são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deletando credencial: system_name=${systemName}, customer_key=${customerKey}`);

    // Chamar DELETE na API Judit
    const response = await fetch('https://crawler.prod.judit.io/credentials', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'api-key': JUDIT_API_KEY,
      },
      body: JSON.stringify({
        system_name: systemName,
        customer_key: customerKey,
      }),
    });

    const responseText = await response.text();
    console.log(`Resposta Judit: status=${response.status}, body=${responseText}`);

    if (!response.ok) {
      throw new Error(`Erro na API Judit: ${response.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Credencial removida do cofre Judit' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao deletar credencial:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
