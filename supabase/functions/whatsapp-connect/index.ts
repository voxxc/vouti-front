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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

    const { action, instanceName = 'whatsapp-bot' } = await req.json();

    switch (action) {
      case 'create_instance':
        // Criar instância do WhatsApp
        const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            instanceName,
            token: EVOLUTION_API_KEY,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          }),
        });

        const createData = await createResponse.json();
        console.log('Instance created:', createData);

        return new Response(JSON.stringify({
          success: true,
          data: createData,
          instanceName
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_qrcode':
        // Obter QR Code
        const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        const qrData = await qrResponse.json();
        console.log('QR Code data:', qrData);

        return new Response(JSON.stringify({
          success: true,
          qrcode: qrData.base64 || qrData.code,
          instanceName
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_status':
        // Verificar status da conexão
        const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        const statusData = await statusResponse.json();
        console.log('Connection status:', statusData);

        return new Response(JSON.stringify({
          success: true,
          status: statusData.instance?.connectionStatus || 'disconnected',
          instanceName
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'disconnect':
        // Desconectar instância
        const disconnectResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        });

        const disconnectData = await disconnectResponse.json();
        console.log('Disconnected:', disconnectData);

        return new Response(JSON.stringify({
          success: true,
          data: disconnectData,
          instanceName
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