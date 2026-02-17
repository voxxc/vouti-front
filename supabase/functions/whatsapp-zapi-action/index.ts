const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, zapi_instance_id, zapi_instance_token, zapi_client_token, zapi_url, zapi_token, provider, meta_phone_number_id, meta_access_token } = body;

    if (!action) {
      throw new Error('Missing required field: action');
    }

    // ========== META PROVIDER ==========
    if (provider === 'meta') {
      if (action === 'status') {
        if (!meta_phone_number_id || !meta_access_token) {
          throw new Error('Meta credentials required for status check');
        }

        const metaUrl = `https://graph.facebook.com/v21.0/${meta_phone_number_id}`;
        const metaResponse = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${meta_access_token}` },
        });

        const metaData = await metaResponse.json();
        console.log('Meta status response:', metaData);

        // If we get a valid response with id, the token works = connected
        const isConnected = !!metaData.id && !metaData.error;

        return new Response(JSON.stringify({
          success: metaResponse.ok,
          data: {
            connected: isConnected,
            phone_number: metaData.display_phone_number,
            quality_rating: metaData.quality_rating,
            verified_name: metaData.verified_name,
            raw: metaData,
          },
          action: action
        }), {
          status: metaResponse.ok ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Meta does not support disconnect or qr-code
      if (action === 'disconnect' || action === 'qr-code') {
        return new Response(JSON.stringify({
          success: true,
          data: { message: 'Action not applicable for Meta provider' },
          action: action
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unsupported action for Meta provider: ${action}`);
    }

    // ========== Z-API PROVIDER (existing logic) ==========
    let baseUrl: string;
    let clientToken: string | null = null;

    // PRIORIDADE 1: Credenciais específicas do agente (novo formato)
    if (zapi_instance_id && zapi_instance_token) {
      baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;
      if (zapi_client_token && zapi_client_token.trim() !== '') {
        clientToken = zapi_client_token.trim();
      }
      console.log('Using agent-specific credentials');
    }
    // PRIORIDADE 2: Formato antigo com URL completa (retrocompatibilidade)
    else if (zapi_url && zapi_token) {
      baseUrl = zapi_url
        .replace(/\/send-text\/?$/, '')
        .replace(/\/$/, '');
      clientToken = zapi_token;
      console.log('Using legacy URL format');
    } 
    // PRIORIDADE 3: Fallback para variáveis de ambiente (secrets globais)
    else {
      const envUrl = Deno.env.get('Z_API_URL');
      const envToken = Deno.env.get('Z_API_TOKEN');
      
      if (envUrl && envToken) {
        baseUrl = envUrl
          .replace(/\/send-text\/?$/, '')
          .replace(/\/$/, '');
        clientToken = envToken;
        console.log('Using environment variable fallback');
      } else {
        throw new Error('Missing Z-API credentials. Provide credentials or configure Z_API_URL and Z_API_TOKEN environment variables');
      }
    }

    let endpoint = '';
    let method = 'GET';

    let requestBody: string | null = null;

    switch (action) {
      case 'status':
        endpoint = `${baseUrl}/status`;
        break;
      case 'disconnect':
        endpoint = `${baseUrl}/disconnect`;
        method = 'GET';
        break;
      case 'qr-code':
        endpoint = `${baseUrl}/qr-code/image`;
        break;
      case 'update-notify-sent-by-me':
        endpoint = `${baseUrl}/update-notify-sent-by-me`;
        method = 'PUT';
        requestBody = JSON.stringify({ notifySentByMe: true });
        break;
      case 'set-webhook':
        endpoint = `${baseUrl}/update-webhook`;
        method = 'POST';
        requestBody = JSON.stringify({
          webhookUrl: "https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-webhook",
          sendAckCallback: false,
        });
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log(`Z-API Action: ${action} -> ${endpoint}`);
    console.log(`Client-Token: ${clientToken ? '[PROVIDED]' : '[NOT SENT]'}`);

    // Headers - só adiciona Client-Token se foi fornecido explicitamente
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers,
    };
    if (requestBody) {
      fetchOptions.body = requestBody;
    }

    const zapiResponse = await fetch(endpoint, fetchOptions);

    // Verificar se a resposta é imagem (QR Code pode retornar PNG direto)
    const contentType = zapiResponse.headers.get('content-type');
    console.log('Z-API Response Content-Type:', contentType);
    
    let zapiData;
    if (contentType?.includes('image/')) {
      // Se for imagem, converter para base64
      const buffer = await zapiResponse.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      zapiData = { value: `data:image/png;base64,${base64}` };
      console.log('Z-API Response: [IMAGE converted to base64]');
    } else {
      // Se for JSON, parse normal
      zapiData = await zapiResponse.json();
      console.log('Z-API Response:', zapiData);
    }

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
