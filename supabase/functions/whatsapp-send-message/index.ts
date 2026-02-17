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
    if (!phone || typeof phone !== 'string' || phone.length > 50) {
      throw new Error('Invalid phone number');
    }

    // Message can be empty for media-only sends
    if (messageType === 'text' && (!message || typeof message !== 'string' || message.length > 10000)) {
      throw new Error('Invalid message');
    }
    if (message && (typeof message !== 'string' || message.length > 10000)) {
      throw new Error('Invalid message');
    }

    if (messageType && !['text', 'image', 'audio', 'video', 'document'].includes(messageType)) {
      throw new Error('Invalid message type');
    }

    if (mediaUrl && (typeof mediaUrl !== 'string' || mediaUrl.length > 5000)) {
      throw new Error('Invalid media URL');
    }

    if (agentName && (typeof agentName !== 'string' || agentName.length > 100)) {
      throw new Error('Invalid agent name');
    }

    // Prefix with agent name if present
    const finalMessage = message ? (agentName ? `*${agentName}*\n\n${message}` : message) : '';

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

    // Resolve instance credentials from DB - prioritize agent-specific instance
    const instanceSelect = 'zapi_instance_id, zapi_instance_token, zapi_client_token, instance_name, user_id, provider, meta_phone_number_id, meta_access_token';
    let instance: any = null;

    // Priority 1: If agentId provided, find the instance linked to this agent
    if (agentId) {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select(instanceSelect)
        .eq('agent_id', agentId)
        .limit(1)
        .maybeSingle();
      instance = data;
    }

    // Priority 2: Fallback to tenant-level instance (backward compatibility)
    if (!instance) {
      let fallbackQuery = supabase
        .from('whatsapp_instances')
        .select(instanceSelect);

      if (mode === 'superadmin') {
        fallbackQuery = fallbackQuery.is('tenant_id', null);
      } else if (tenantId) {
        fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
      }

      const { data } = await fallbackQuery.limit(1).maybeSingle();
      instance = data;
    }

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
      } else if (mediaUrl) {
        const metaType = messageType === 'image' ? 'image' 
          : messageType === 'video' ? 'video'
          : messageType === 'audio' ? 'audio' 
          : 'document';
        
        if (metaType === 'audio') {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: 'audio', audio: { link: mediaUrl } };
        } else {
          metaPayload = { messaging_product: 'whatsapp', to: phone, type: metaType, [metaType]: { link: mediaUrl, caption: finalMessage } };
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
      } else if (mediaUrl) {
        const endpointMap: Record<string, string> = {
          image: 'send-image',
          audio: 'send-audio',
          video: 'send-video',
          document: 'send-document',
        };
        const endpoint = endpointMap[messageType] || 'send-document';
        apiEndpoint = `${baseUrl}/${endpoint}`;
        
        const mediaKeyMap: Record<string, string> = {
          image: 'image',
          audio: 'audio',
          video: 'video',
          document: 'document',
        };
        const mediaKey = mediaKeyMap[messageType] || 'document';
        messagePayload = { phone, [mediaKey]: mediaUrl };
        if (finalMessage && messageType !== 'audio') {
          messagePayload.caption = finalMessage;
        }
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
      message_type: messageType || 'text',
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
