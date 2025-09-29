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
    const Z_API_URL = Deno.env.get('Z_API_URL');
    const Z_API_INSTANCE_ID = Deno.env.get('Z_API_INSTANCE_ID');
    const Z_API_TOKEN = Deno.env.get('Z_API_TOKEN');

    console.log('Z-API Configuration:', {
      url: Z_API_URL ? 'configured' : 'missing',
      instanceId: Z_API_INSTANCE_ID ? 'configured' : 'missing',
      token: Z_API_TOKEN ? 'configured' : 'missing'
    });

    if (!Z_API_URL || !Z_API_INSTANCE_ID || !Z_API_TOKEN) {
      throw new Error(`Z-API credentials not configured. Missing: ${[
        !Z_API_URL && 'Z_API_URL',
        !Z_API_INSTANCE_ID && 'Z_API_INSTANCE_ID', 
        !Z_API_TOKEN && 'Z_API_TOKEN'
      ].filter(Boolean).join(', ')}`);
    }

    const { action } = await req.json();

    console.log('WhatsApp Connect Action:', action);

    switch (action) {
      case 'create_instance':
        // Com Z-API a instância já existe, apenas verificamos se está ativa
        console.log('Checking Z-API instance status...');
        
        const statusResponse = await fetch(`${Z_API_URL}/v1/status/${Z_API_INSTANCE_ID}`, {
          method: 'GET',
          headers: {
            'Client-Token': Z_API_TOKEN,
          },
        });

        const statusData = await statusResponse.json();
        console.log('Z-API Status Response:', statusData);

        return new Response(JSON.stringify({
          success: true,
          data: statusData,
          message: 'Instance checked successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_qrcode':
        // Obter QR Code do Z-API
        console.log('Getting QR Code from Z-API...');
        
        const qrResponse = await fetch(`${Z_API_URL}/v1/qr-code/${Z_API_INSTANCE_ID}`, {
          method: 'GET',
          headers: {
            'Client-Token': Z_API_TOKEN,
          },
        });

        if (!qrResponse.ok) {
          throw new Error(`Z-API QR request failed: ${qrResponse.status} ${qrResponse.statusText}`);
        }

        const qrData = await qrResponse.json();
        console.log('Z-API QR Response:', qrData);

        return new Response(JSON.stringify({
          success: true,
          qrcode: qrData.value || qrData.qrcode,
          message: 'QR Code retrieved successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_status':
        // Verificar status da conexão Z-API
        console.log('Getting Z-API connection status...');
        
        const connectionResponse = await fetch(`${Z_API_URL}/v1/status/${Z_API_INSTANCE_ID}`, {
          method: 'GET',
          headers: {
            'Client-Token': Z_API_TOKEN,
          },
        });

        const connectionData = await connectionResponse.json();
        console.log('Z-API Connection Status:', connectionData);

        // Z-API retorna status como "CONNECTED", "DISCONNECTED", etc.
        const isConnected = connectionData.connected === true || connectionData.status === 'CONNECTED';

        return new Response(JSON.stringify({
          success: true,
          status: isConnected ? 'open' : 'disconnected',
          data: connectionData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'disconnect':
        // Desconectar Z-API
        console.log('Disconnecting Z-API instance...');
        
        const logoutResponse = await fetch(`${Z_API_URL}/v1/logout/${Z_API_INSTANCE_ID}`, {
          method: 'POST',
          headers: {
            'Client-Token': Z_API_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        const logoutData = await logoutResponse.json();
        console.log('Z-API Logout Response:', logoutData);

        return new Response(JSON.stringify({
          success: true,
          data: logoutData,
          message: 'Instance disconnected successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'restart':
        // Reiniciar instância Z-API
        console.log('Restarting Z-API instance...');
        
        const restartResponse = await fetch(`${Z_API_URL}/v1/restart/${Z_API_INSTANCE_ID}`, {
          method: 'POST',
          headers: {
            'Client-Token': Z_API_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        const restartData = await restartResponse.json();
        console.log('Z-API Restart Response:', restartData);

        return new Response(JSON.stringify({
          success: true,
          data: restartData,
          message: 'Instance restarted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in whatsapp-connect function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});