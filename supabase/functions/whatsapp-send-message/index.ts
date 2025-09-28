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

    if (!Z_API_URL || !Z_API_INSTANCE_ID || !Z_API_TOKEN) {
      throw new Error('Z-API credentials not configured');
    }

    const { 
      phone, 
      message, 
      messageType = 'text',
      mediaUrl 
    } = await req.json();

    console.log('Sending message via Z-API:', { phone, messageType });

    let endpoint = '';
    let messageData: any = {};

    if (messageType === 'text') {
      endpoint = `${Z_API_URL}/v1/send-text/${Z_API_INSTANCE_ID}`;
      messageData = {
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        message: message
      };
    } else if (messageType === 'media' && mediaUrl) {
      endpoint = `${Z_API_URL}/v1/send-image/${Z_API_INSTANCE_ID}`;
      messageData = {
        phone: phone.replace(/\D/g, ''),
        image: mediaUrl,
        caption: message || ''
      };
    } else {
      throw new Error('Invalid message type or missing data');
    }

    console.log('Z-API Request:', { endpoint, messageData });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': Z_API_TOKEN,
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    console.log('Z-API Response:', data);

    if (!response.ok) {
      throw new Error(`Z-API Error: ${data.message || 'Failed to send message'}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      messageId: data.messageId || data.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});