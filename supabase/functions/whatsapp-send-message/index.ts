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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, message, messageType = 'text', mediaUrl, mode, agentName, agentId } = await req.json();

    // Input validation
    if (!phone || typeof phone !== 'string' || phone.length > 20) {
      throw new Error('Invalid phone number');
    }

    if (!message || typeof message !== 'string' || message.length > 10000) {
      throw new Error('Invalid message');
    }

    if (messageType && !['text', 'media'].includes(messageType)) {
      throw new Error('Invalid message type');
    }

    if (mediaUrl && (typeof mediaUrl !== 'string' || mediaUrl.length > 2000)) {
      throw new Error('Invalid media URL');
    }

    if (agentName && (typeof agentName !== 'string' || agentName.length > 100)) {
      throw new Error('Invalid agent name');
    }

    // Prefix with agent name if present
    const finalMessage = agentName ? `*${agentName}*\n\n${message}` : message;

    // Resolve tenant_id from JWT if available
    let tenantId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && mode !== 'superadmin') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();
          tenantId = profile?.tenant_id || null;
        }
      } catch (e) {
        // Could not extract tenant_id from token
      }
    }

    // Resolve instance credentials from DB
    let instanceQuery = supabase
      .from('whatsapp_instances')
      .select('zapi_instance_id, zapi_instance_token, zapi_client_token, instance_name, user_id, provider, meta_phone_number_id, meta_access_token');

    if (mode === 'superadmin') {
      instanceQuery = instanceQuery.is('tenant_id', null);
    } else if (tenantId) {
      instanceQuery = instanceQuery.eq('tenant_id', tenantId);
    }

    const { data: instance } = await instanceQuery.limit(1).single();

    const provider = instance?.provider || 'zapi';
    let apiResponseData: any;
    let zapiInstanceId: string | undefined;

    if (provider === 'meta') {
      const metaPhoneId = instance?.meta_phone_number_id;
      const metaToken = instance?.meta_access_token;

      if (!metaPhoneId || !metaToken) {
        throw new Error('Meta WhatsApp credentials not configured');
      }

      const metaUrl = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`;
      
      let metaPayload: Record<string, unknown>;
      
      if (messageType === 'text') {
        metaPayload = {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: finalMessage },
        };
      } else if (messageType === 'media' && mediaUrl) {
        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(mediaUrl);
        const isVideo = /\.(mp4|3gp)(\?|$)/i.test(mediaUrl);
        const isAudio = /\.(mp3|ogg|opus|aac)(\?|$)/i.test(mediaUrl);
        
        if (isImage) {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: 'image', image: { link: mediaUrl, caption: finalMessage } };
        } else if (isVideo) {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: 'video', video: { link: mediaUrl, caption: finalMessage } };
        } else if (isAudio) {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: 'audio', audio: { link: mediaUrl } };
        } else {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: 'document', document: { link: mediaUrl, caption: finalMessage } };
        }
      } else {
        throw new Error('Invalid message type or missing media URL');
      }

      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      });

      apiResponseData = await metaResponse.json();

      if (!metaResponse.ok) {
        throw new Error('Failed to send message via Meta API');
      }
    } else {
      zapiInstanceId = instance?.zapi_instance_id;
      let zapiInstanceToken = instance?.zapi_instance_token;
      let zapiClientToken = instance?.zapi_client_token;

      if (!zapiInstanceId) zapiInstanceId = Deno.env.get('Z_API_INSTANCE_ID');
      if (!zapiInstanceToken) zapiInstanceToken = Deno.env.get('Z_API_TOKEN');

      if (!zapiInstanceId || !zapiInstanceToken) {
        throw new Error('Z-API credentials not configured');
      }

      const baseUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}`;

      let apiEndpoint = '';
      let messagePayload: Record<string, unknown> = {};

      if (messageType === 'text') {
        apiEndpoint = `${baseUrl}/send-text`;
        messagePayload = { phone, message: finalMessage };
      } else if (messageType === 'media' && mediaUrl) {
        apiEndpoint = `${baseUrl}/send-file-url`;
        messagePayload = { phone, message: finalMessage, url: mediaUrl };
      } else {
        throw new Error('Invalid message type or missing media URL');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (zapiClientToken) {
        headers['Client-Token'] = zapiClientToken;
      }

      const zapiResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(messagePayload),
      });

      apiResponseData = await zapiResponse.json();

      if (!zapiResponse.ok) {
        throw new Error('Failed to send message via Z-API');
      }
    }

    // Save message to database
    const messageRecord: Record<string, unknown> = {
      from_number: phone,
      message_text: finalMessage,
      direction: 'outgoing',
      instance_name: instance?.instance_name || zapiInstanceId,
      message_id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_type: 'text',
      timestamp: new Date().toISOString(),
      is_read: true,
      user_id: instance?.user_id || null,
      agent_id: agentId || null,
    };

    if (mode !== 'superadmin' && tenantId) {
      messageRecord.tenant_id = tenantId;
    }

    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(messageRecord);

    if (insertError) {
      console.error('Error saving message to DB');
    }

    return new Response(JSON.stringify({
      success: true,
      data: apiResponseData,
      messageType,
      provider: instance?.provider || 'zapi',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-send-message');
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
