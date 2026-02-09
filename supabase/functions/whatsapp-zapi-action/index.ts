import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, zapi_url, zapi_token } = await req.json();

    // Validar parametros
    if (!action || !zapi_url || !zapi_token) {
      throw new Error('Missing required fields: action, zapi_url, or zapi_token');
    }

    // Normalizar URL removendo /send-text se existir no final
    const baseUrl = zapi_url.replace(/\/send-text\/?$/, '');

    let endpoint = '';
    let method = 'GET';

    switch (action) {
      case 'status':
        endpoint = `${baseUrl}/status`;
        break;
      case 'disconnect':
        endpoint = `${baseUrl}/disconnect`;
        method = 'POST';
        break;
      case 'qr-code':
        endpoint = `${baseUrl}/qr-code/image`;
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log(`Z-API Action: ${action} -> ${endpoint}`);

    const zapiResponse = await fetch(endpoint, {
      method: method,
      headers: {
        'Client-Token': zapi_token,
        'Content-Type': 'application/json',
      },
    });

    const zapiData = await zapiResponse.json();
    console.log('Z-API Response:', zapiData);

    return new Response(JSON.stringify({
      success: zapiResponse.ok,
      data: zapiData,
      action: action
    }), {
      status: zapiResponse.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-zapi-action:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
