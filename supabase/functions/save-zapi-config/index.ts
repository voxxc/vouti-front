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
    const { url, instanceId, token } = await req.json();

    console.log('Saving Z-API configuration...');

    // Validar se todos os campos foram fornecidos
    if (!url || !instanceId || !token) {
      throw new Error('Missing required fields: url, instanceId, or token');
    }

    // Salvar as configurações nas variáveis de ambiente do Deno
    // Isso simula o salvamento para o usuário poder configurar depois
    console.log('Z-API Configuration received (fields validated)');

    // Em um ambiente real, essas configurações seriam salvas via:
    // 1. Interface do Supabase Dashboard para secrets
    // 2. Ou usando a ferramenta de secrets do Lovable
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Z-API configuration received successfully. Please configure the secrets Z_API_URL, Z_API_INSTANCE_ID, and Z_API_TOKEN in the Supabase dashboard.',
      instructions: {
        Z_API_URL: url.trim(),
        Z_API_INSTANCE_ID: instanceId.trim(),
        Z_API_TOKEN: token.trim()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error saving Z-API configuration:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});