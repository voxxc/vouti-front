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

    const { 
      instanceName = 'whatsapp-bot', 
      number, 
      message, 
      messageType = 'text',
      mediaUrl 
    } = await req.json();

    let messageData;

    if (messageType === 'text') {
      messageData = {
        number,
        textMessage: {
          text: message
        }
      };
    } else if (messageType === 'media' && mediaUrl) {
      messageData = {
        number,
        mediaMessage: {
          mediatype: 'image', // ou 'video', 'audio', 'document'
          media: mediaUrl,
          caption: message || ''
        }
      };
    } else {
      throw new Error('Invalid message type or missing data');
    }

    console.log('Sending message:', { instanceName, number, messageType });

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    console.log('Message sent:', data);

    return new Response(JSON.stringify({
      success: true,
      data,
      messageId: data.key?.id
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