import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { phone, message, messageType = 'text', mediaUrl, mode } = await req.json();

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

    console.log(`Sending ${messageType} message to ${phone} (mode: ${mode || 'tenant'})`);

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

    // Save message to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Se mode === 'superadmin', não define tenant_id (fica NULL)
    const messageRecord: Record<string, unknown> = {
      from_number: phone,
      message_text: message,
      direction: 'outgoing',
      instance_name: mode === 'superadmin' ? 'whatsapp-bot' : 'default',
      message_id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_type: 'text',
      timestamp: new Date().toISOString(),
      is_read: true,
    };

    // Apenas define tenant_id se NÃO for Super Admin
    if (mode !== 'superadmin') {
      // Tentar extrair tenant_id do JWT se disponível
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('tenant_id')
              .eq('user_id', user.id)
              .single();
            if (profile?.tenant_id) {
              messageRecord.tenant_id = profile.tenant_id;
            }
          }
        } catch (e) {
          console.log('Could not extract tenant_id from token:', e);
        }
      }
    }

    // Salvar mensagem
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageRecord);

    if (insertError) {
      console.log('Error saving message to DB:', insertError);
      // Não falha a requisição, apenas loga o erro
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