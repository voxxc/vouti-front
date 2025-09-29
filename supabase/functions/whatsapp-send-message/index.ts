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
    // Get Z-API credentials from environment
    const zapiUrl = Deno.env.get('Z_API_URL');
    const zapiInstanceId = Deno.env.get('Z_API_INSTANCE_ID');
    const zapiToken = Deno.env.get('Z_API_TOKEN');

    if (!zapiUrl || !zapiInstanceId || !zapiToken) {
      throw new Error('Z-API credentials not configured');
    }

    const { phone, message, messageType = 'text', mediaUrl } = await req.json();

    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    let apiEndpoint = '';
    let messagePayload = {};

    if (messageType === 'text') {
      apiEndpoint = `${zapiUrl}/send-text`;
      messagePayload = {
        phone: phone,
        message: message
      };
    } else if (messageType === 'media' && mediaUrl) {
      apiEndpoint = `${zapiUrl}/send-file-url`;
      messagePayload = {
        phone: phone,
        message: message,
        url: mediaUrl
      };
    } else {
      throw new Error('Invalid message type or missing media URL');
    }

    console.log(`Sending ${messageType} message to ${phone}`);

    // Make request to Z-API
    const zapiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Client-Token': zapiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const zapiData = await zapiResponse.json();
    console.log('Z-API Response:', zapiData);

    if (!zapiResponse.ok) {
      throw new Error(`Z-API Error: ${zapiData.message || 'Failed to send message'}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: zapiData,
      messageType: messageType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-send-message function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});