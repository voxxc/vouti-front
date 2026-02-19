import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mask sensitive data for logging
function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  return phone.substring(0, 4) + '***' + phone.substring(phone.length - 2);
}

// Normaliza telefone brasileiro para formato com 9 dígitos
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/@.*$/, '').replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  return cleaned;
}

function isLidNumber(phone: string): boolean {
  if (phone.includes('@lid')) return true;
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 13 && !digits.startsWith('55')) return true;
  return false;
}

async function resolvePhoneFromLid(data: any, originalPhone: string): Promise<string | null> {
  if (data.chatId && typeof data.chatId === 'string') {
    const chatPhone = data.chatId.replace(/@.*$/, '').replace(/\D/g, '');
    if (chatPhone.startsWith('55') && chatPhone.length >= 12 && chatPhone.length <= 13) {
      return chatPhone;
    }
  }

  if (data.chatLid && typeof data.chatLid === 'string') {
    const chatLidPhone = data.chatLid.replace(/@.*$/, '').replace(/\D/g, '');
    if (chatLidPhone.startsWith('55') && chatLidPhone.length >= 12 && chatLidPhone.length <= 13) {
      return chatLidPhone;
    }
  }
  
  if (data.to && typeof data.to === 'string') {
    const toPhone = data.to.replace(/@.*$/, '').replace(/\D/g, '');
    if (toPhone.startsWith('55') && toPhone.length >= 12 && toPhone.length <= 13) {
      return toPhone;
    }
  }

  const lidOriginal = originalPhone.includes('@') ? originalPhone : `${originalPhone}@lid`;
  const lidClean = originalPhone.replace(/@.*$/, '');
  
  const { data: match } = await supabase
    .from('whatsapp_messages')
    .select('from_number')
    .eq('direction', 'received')
    .or(`raw_data->>chatLid.eq.${lidOriginal},raw_data->>chatLid.eq.${lidClean},raw_data->>phone.eq.${lidClean}`)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (match?.from_number) {
    return match.from_number;
  }

  console.warn('Could not resolve LID');
  return null;
}

// Validate webhook data structure
function validateWebhookData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  // Accept any valid object - specific field validation happens inside handlers
  return true;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to save outgoing messages to the database
async function saveOutgoingMessage(
  phone: string,
  message: string,
  tenant_id: string | null,
  instance_name: string,
  user_id?: string,
  agent_id?: string
) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      from_number: phone,
      message_text: message,
      direction: 'outgoing',
      tenant_id: tenant_id,
      instance_name: instance_name,
      message_id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_type: 'text',
      user_id: user_id || null,
      agent_id: agent_id || null,
      timestamp: new Date().toISOString(),
      is_read: true,
    });

  if (error) {
    console.error('Error saving outgoing message');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    
    // Validate input data (basic object check only)
    if (!validateWebhookData(webhookData)) {
      // Still return 200 to prevent Z-API from retrying
      return new Response(
        JSON.stringify({ success: true, ignored: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { type } = webhookData;
    console.log('Webhook received:', type || 'no-type', '| keys:', Object.keys(webhookData).join(','));

    if (type === 'ReceivedCallback' || type === 'message' || type === 'SentByMeCallback') {
      if (!webhookData.phone && !webhookData.instanceId) {
        console.log('Message callback missing phone/instanceId, ignoring');
        return new Response(JSON.stringify({ success: true, ignored: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await handleIncomingMessage(webhookData);
    } else if (type === 'status' || type === 'MessageStatusCallback') {
      await handleStatusUpdate(webhookData);
    } else if (type === 'qrcode') {
      await handleQRCodeUpdate(webhookData);
    } else if (webhookData.phone && (webhookData.text || webhookData.fromMe !== undefined)) {
      await handleIncomingMessage(webhookData);
    } else {
      console.log('Unhandled webhook type:', type || 'unknown');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Detect message type and media URL from Z-API webhook payload
function detectMediaInfo(data: any): { messageType: string; mediaUrl: string | null; caption: string } {
  if (data.image?.imageUrl) {
    return { messageType: 'image', mediaUrl: data.image.imageUrl, caption: data.image.caption || '' };
  }
  if (data.audio?.audioUrl) {
    return { messageType: 'audio', mediaUrl: data.audio.audioUrl, caption: '' };
  }
  if (data.video?.videoUrl) {
    return { messageType: 'video', mediaUrl: data.video.videoUrl, caption: data.video.caption || '' };
  }
  if (data.document?.documentUrl) {
    return { messageType: 'document', mediaUrl: data.document.documentUrl, caption: data.document.caption || data.document.fileName || '' };
  }
  return { messageType: 'text', mediaUrl: null, caption: data.text?.message || '' };
}

async function handleIncomingMessage(data: any) {
  const { instanceId, phone: rawPhone, messageId, text, chatName, momment, fromMe } = data;
  
  let resolvedPhone = rawPhone;
  if (rawPhone && isLidNumber(rawPhone)) {
    const realPhone = await resolvePhoneFromLid(data, rawPhone);
    if (realPhone) {
      resolvedPhone = realPhone;
    } else {
      return;
    }
  }
  
  const phone = normalizePhoneNumber(resolvedPhone);
  
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('user_id, tenant_id, agent_id, zapi_url, zapi_token, zapi_instance_id, zapi_instance_token, zapi_client_token, instance_name')
    .eq('zapi_instance_id', instanceId)
    .limit(1)
    .maybeSingle();

  if (instanceError || !instance?.user_id) {
    console.error('Instance not found');
    return;
  }

  // Auto-update connection_status to 'connected' when messages arrive
  await supabase
    .from('whatsapp_instances')
    .update({ connection_status: 'connected', updated_at: new Date().toISOString() })
    .eq('zapi_instance_id', instanceId)
    .eq('connection_status', 'disconnected');

  const effectiveTenantId = instance.tenant_id || null;

  // Resolve effective agent: check if conversation was transferred to another agent
  let effectiveAgentId = instance.agent_id || null;
  if (effectiveTenantId && effectiveAgentId) {
    // 1. Priorizar kanban do agente da instancia
    const { data: ownKanban } = await supabase
      .from('whatsapp_conversation_kanban')
      .select('agent_id')
      .eq('phone', phone)
      .eq('tenant_id', effectiveTenantId)
      .eq('agent_id', effectiveAgentId)
      .limit(1)
      .maybeSingle();

    if (!ownKanban) {
      // 2. Contato NAO esta no kanban deste agente - verificar transferencia
      const { data: otherKanban } = await supabase
        .from('whatsapp_conversation_kanban')
        .select('agent_id')
        .eq('phone', phone)
        .eq('tenant_id', effectiveTenantId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otherKanban?.agent_id) {
        console.log('🔀 Conversation routed: instance agent -> kanban agent (transfer)');
        effectiveAgentId = otherKanban.agent_id;
      }
    }
  }

  const mediaInfo = detectMediaInfo(data);

  if (fromMe) {
    if (data.fromApi) {
      return;
    }
    
    const { error: outErr } = await supabase
      .from('whatsapp_messages')
      .insert({
      instance_name: instanceId,
      message_id: messageId || `msg_${Date.now()}`,
      from_number: phone,
      message_text: mediaInfo.caption || text?.message || '',
      message_type: mediaInfo.messageType,
      direction: 'outgoing',
      raw_data: data,
      user_id: instance.user_id,
      agent_id: effectiveAgentId,
      tenant_id: effectiveTenantId,
      timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
      is_read: true,
      });
    
    if (outErr) {
      console.error('Error saving outgoing phone message');
    }
    return;
  }
  
  const { error: insertError } = await supabase
    .from('whatsapp_messages')
    .insert({
      instance_name: instanceId,
      message_id: messageId || `msg_${Date.now()}`,
      from_number: phone,
      message_text: mediaInfo.caption || text?.message || '',
      message_type: mediaInfo.messageType,
      direction: 'received',
      raw_data: data,
      user_id: instance.user_id,
      agent_id: effectiveAgentId,
      tenant_id: effectiveTenantId,
      timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
      is_read: false
    });

  if (insertError) {
    console.error('Error saving message');
    return;
  }

  const aiHandled = await handleAIResponse(
    phone, 
    text?.message || '', 
    effectiveTenantId, 
    instanceId,
    instance.user_id,
    {
      zapi_instance_id: instance.zapi_instance_id,
      zapi_instance_token: instance.zapi_instance_token,
      zapi_client_token: instance.zapi_client_token,
    },
    effectiveAgentId
  );

  if (aiHandled) {
    return;
  }

  const { data: automations, error: automationError } = await supabase
    .from('whatsapp_automations')
    .select('*')
    .eq('instance_name', instanceId)
    .eq('is_active', true);

  if (automationError) {
    console.error('Error fetching automations');
    return;
  }

  for (const automation of automations || []) {
    const messageText = (text?.message || '').toLowerCase();
    const triggerKeyword = automation.trigger_keyword.toLowerCase();
    
    if (messageText.includes(triggerKeyword)) {
      if (!instance.zapi_url || !instance.zapi_token) {
        continue;
      }

      try {
        const globalZapiUrl = Deno.env.get('Z_API_URL');
        const globalZapiToken = Deno.env.get('Z_API_TOKEN');
        
        if (!globalZapiUrl || !globalZapiToken) {
          continue;
        }
        
        const apiEndpoint = `${globalZapiUrl}/send-text`;
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': globalZapiToken,
          },
          body: JSON.stringify({
            phone: phone,
            message: automation.response_message,
          }),
        });

        const responseText = await response.text();
        let responseData: any;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }
        
        if (response.ok) {
          await saveOutgoingMessage(
            phone,
            automation.response_message,
            instance.tenant_id,
            instanceId,
            instance.user_id,
            instance.agent_id
          );
        } else {
          console.error('Z-API automation error:', response.status);
        }
      } catch (error) {
        console.error('Error sending automated response');
      }
      
      break;
    }
  }
}

async function handleAIResponse(
  phone: string, 
  message: string, 
  tenant_id: string | null, 
  instanceId: string,
  user_id: string,
  instanceCredentials: {
    zapi_instance_id?: string;
    zapi_instance_token?: string;
    zapi_client_token?: string;
  },
  agent_id?: string
): Promise<boolean> {
  try {
    let disabledQuery = supabase
      .from('whatsapp_ai_disabled_contacts')
      .select('id')
      .eq('phone_number', phone);
    
    if (tenant_id) {
      disabledQuery = disabledQuery.eq('tenant_id', tenant_id);
    } else {
      disabledQuery = disabledQuery.is('tenant_id', null);
    }
    
    const { data: disabledContact } = await disabledQuery.maybeSingle();
    
    if (disabledContact) {
      return false;
    }

    let aiConfig: any = null;

    if (agent_id) {
      const { data } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('agent_id', agent_id)
        .maybeSingle();
      aiConfig = data;
    }

    if (!aiConfig && !agent_id) {
      let fallbackQuery = supabase
        .from('whatsapp_ai_config')
        .select('*')
        .is('agent_id', null);

      if (tenant_id) {
        fallbackQuery = fallbackQuery.eq('tenant_id', tenant_id);
      } else {
        fallbackQuery = fallbackQuery.is('tenant_id', null);
      }

      const { data } = await fallbackQuery.maybeSingle();
      aiConfig = data;
    }

    if (!aiConfig || !aiConfig.is_enabled) {
      return false;
    }

    const delaySeconds = aiConfig.response_delay_seconds || 0;
    if (delaySeconds > 0) {
      const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
      
      let existingQuery = supabase
        .from('whatsapp_ai_pending_responses')
        .select('id')
        .eq('phone', phone);
      
      if (tenant_id) {
        existingQuery = existingQuery.eq('tenant_id', tenant_id);
      } else {
        existingQuery = existingQuery.is('tenant_id', null);
      }
      
      const { data: existingPending } = await existingQuery.maybeSingle();
      
      let upsertError: any = null;
      if (existingPending) {
        const { error } = await supabase
          .from('whatsapp_ai_pending_responses')
          .update({ scheduled_at: scheduledAt, status: 'pending' })
          .eq('id', existingPending.id);
        upsertError = error;
      } else {
        const { error } = await supabase
          .from('whatsapp_ai_pending_responses')
          .insert({
            phone,
            tenant_id,
            instance_id: instanceId,
            scheduled_at: scheduledAt,
            status: 'pending',
          });
        upsertError = error;
      }

      if (upsertError) {
        console.error('Error creating debounce timer');
      } else {
        fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-debounce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            phone,
            tenant_id,
            instance_id: instanceId,
            scheduled_at: scheduledAt,
            user_id,
            delay_seconds: delaySeconds,
            instance_credentials: instanceCredentials,
            agent_id,
          }),
        }).catch(err => console.error('Error dispatching debounce'));

        return true;
      }
    }

    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        phone,
        message,
        tenant_id,
        agent_id,
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiData.success || !aiData.response) {
      return false;
    }

    await saveOutgoingMessage(
      phone,
      aiData.response,
      tenant_id,
      instanceId,
      user_id,
      agent_id
    );

    let baseUrl: string | undefined;
    let clientToken: string | undefined;
    
    if (instanceCredentials.zapi_instance_id && instanceCredentials.zapi_instance_token) {
      baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
      clientToken = instanceCredentials.zapi_client_token || undefined;
    } else {
      baseUrl = Deno.env.get('Z_API_URL');
      clientToken = Deno.env.get('Z_API_TOKEN');
    }
    
    if (!baseUrl) {
      console.error('No Z-API credentials available');
      return true;
    }

    const apiEndpoint = `${baseUrl}/send-text`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }
    
    const sendResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone,
        message: aiData.response,
      }),
    });

    if (!sendResponse.ok) {
      console.error('Z-API AI response error:', sendResponse.status);
    }
    
    return true;
  } catch (error) {
    console.error('Error in AI handler');
    return false;
  }
}

async function handleStatusUpdate(data: any) {
  const { instanceId, status } = data;
  
  const { error } = await supabase
    .from('whatsapp_instances')
    .upsert({
      instance_name: instanceId,
      connection_status: status === 'open' ? 'connected' : 'disconnected',
      last_update: new Date().toISOString(),
    }, {
      onConflict: 'instance_name'
    });

  if (error) {
    console.error('Error updating instance status');
  }
}

async function handleQRCodeUpdate(data: any) {
  const { instanceId, qrcode } = data;
  
  const { error } = await supabase
    .from('whatsapp_instances')
    .upsert({
      instance_name: instanceId,
      qr_code: qrcode,
      connection_status: 'awaiting_qr',
      last_update: new Date().toISOString(),
    }, {
      onConflict: 'instance_name'
    });

  if (error) {
    console.error('Error updating QR code');
  }
}
