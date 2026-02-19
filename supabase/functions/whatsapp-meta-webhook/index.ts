import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Normaliza telefone brasileiro para formato com 9 dígitos
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = '55' + cleaned;
    if (cleaned.length === 12) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(4);
      return `55${ddd}9${number}`;
    }
  }
  return cleaned;
}

// Mapeamento de tipo de mensagem Meta -> message_type do banco
const metaTypeMap: Record<string, string> = {
  'text': 'text',
  'image': 'image',
  'audio': 'audio',
  'video': 'video',
  'document': 'document',
  'location': 'text',
  'contacts': 'text',
  'sticker': 'sticker',
};

// Buscar URL real de mídia do Meta
async function fetchMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.log('⚠️ Could not fetch media URL:', response.status);
      const text = await response.text();
      console.log('Media API response:', text.substring(0, 200));
      return null;
    }
    const data = await response.json();
    return data.url || null;
  } catch (e) {
    console.log('⚠️ Error fetching media URL:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  // Meta Webhook Verification (GET request)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('🔐 Meta webhook verification:', { mode, token: token ? '[PROVIDED]' : '[MISSING]' });

    if (mode === 'subscribe' && token) {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('id, meta_verify_token')
        .eq('provider', 'meta')
        .eq('meta_verify_token', token)
        .limit(1)
        .maybeSingle();

      if (instance) {
        console.log('✅ Webhook verified for instance:', instance.id);
        return new Response(challenge, { status: 200 });
      }
    }

    console.error('❌ Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST - Incoming messages from Meta
  try {
    const body = await req.json();
    console.log('📩 Meta webhook payload:', JSON.stringify(body).substring(0, 500));

    if (body.object !== 'whatsapp_business_account') {
      console.log('⏭️ Not a WhatsApp event, ignoring');
      return new Response('OK', { status: 200 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) {
          console.log('⏭️ No phone_number_id in metadata');
          continue;
        }

        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('id, user_id, tenant_id, agent_id, instance_name, meta_access_token, meta_phone_number_id')
          .eq('provider', 'meta')
          .eq('meta_phone_number_id', phoneNumberId)
          .limit(1)
          .maybeSingle();

        if (!instance) {
          console.error('❌ No instance found for phone_number_id:', phoneNumberId);
          continue;
        }

        // Process status updates
        for (const status of value.statuses || []) {
          console.log(`📊 Message status: ${status.id} -> ${status.status}`);
        }

        // Process incoming messages
        for (const message of value.messages || []) {
          await handleMetaMessage(message, instance, value);
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Error processing Meta webhook:', error);
    return new Response('OK', { status: 200 });
  }
});

async function handleMetaMessage(
  message: any,
  instance: {
    id: string;
    user_id: string;
    tenant_id: string | null;
    agent_id: string | null;
    instance_name: string;
    meta_access_token: string;
    meta_phone_number_id: string;
  },
  value: any
) {
  const from = message.from;
  const messageId = message.id;
  const timestamp = message.timestamp;
  const type = message.type;

  // Extract message text based on type
  let messageText = '';
  if (type === 'text') {
    messageText = message.text?.body || '';
  } else if (type === 'image') {
    messageText = message.image?.caption || '[Imagem]';
  } else if (type === 'video') {
    messageText = message.video?.caption || '[Vídeo]';
  } else if (type === 'audio') {
    messageText = '[Áudio]';
  } else if (type === 'document') {
    messageText = message.document?.filename || '[Documento]';
  } else if (type === 'location') {
    messageText = `[Localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
  } else if (type === 'contacts') {
    messageText = '[Contato]';
  } else if (type === 'reaction') {
    console.log('⏭️ Ignoring reaction message');
    return;
  } else {
    messageText = `[${type}]`;
  }

  // Get contact name from contacts array
  const contactName = value.contacts?.[0]?.profile?.name || '';

  // Normalize phone number
  const phone = normalizePhoneNumber(from);
  console.log(`📞 Meta message from ${from} -> normalized: ${phone} | type: ${type}`);

  // Resolve effective agent: 2-step routing (same as Z-API)
  let effectiveAgentId = instance.agent_id || null;
  if (instance.tenant_id && effectiveAgentId) {
    // 1. Priorizar kanban do agente dono da instância
    const { data: ownKanban } = await supabase
      .from('whatsapp_conversation_kanban')
      .select('agent_id')
      .eq('phone', phone)
      .eq('tenant_id', instance.tenant_id)
      .eq('agent_id', effectiveAgentId)
      .limit(1)
      .maybeSingle();

    if (!ownKanban) {
      // 2. Contato NÃO está no kanban deste agente - verificar transferência
      const { data: otherKanban } = await supabase
        .from('whatsapp_conversation_kanban')
        .select('agent_id')
        .eq('phone', phone)
        .eq('tenant_id', instance.tenant_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otherKanban?.agent_id) {
        console.log('🔀 Meta: Conversation routed to kanban agent (transfer)');
        effectiveAgentId = otherKanban.agent_id;
      }
    }
  }

  // Build normalized raw_data with media URLs
  let rawData: any = { message, contacts: value.contacts, metadata: value.metadata };

  // Fetch real media URLs for media messages
  if (type === 'image' && message.image?.id) {
    const mediaUrl = await fetchMediaUrl(message.image.id, instance.meta_access_token);
    if (mediaUrl) {
      rawData.image = { imageUrl: mediaUrl, caption: message.image?.caption || '' };
    }
  } else if (type === 'audio' && message.audio?.id) {
    const mediaUrl = await fetchMediaUrl(message.audio.id, instance.meta_access_token);
    if (mediaUrl) {
      rawData.audio = { audioUrl: mediaUrl };
    }
  } else if (type === 'video' && message.video?.id) {
    const mediaUrl = await fetchMediaUrl(message.video.id, instance.meta_access_token);
    if (mediaUrl) {
      rawData.video = { videoUrl: mediaUrl, caption: message.video?.caption || '' };
    }
  } else if (type === 'document' && message.document?.id) {
    const mediaUrl = await fetchMediaUrl(message.document.id, instance.meta_access_token);
    if (mediaUrl) {
      rawData.document = { documentUrl: mediaUrl, fileName: message.document?.filename || '', caption: message.document?.caption || '' };
    }
  }

  // Determine correct message_type
  const mappedMessageType = metaTypeMap[type] || 'text';

  // Save message to database
  const { error: insertError } = await supabase
    .from('whatsapp_messages')
    .insert({
      instance_name: instance.instance_name || instance.id,
      message_id: messageId || `meta_${Date.now()}`,
      from_number: phone,
      message_text: messageText,
      message_type: mappedMessageType,
      direction: 'received',
      raw_data: rawData,
      user_id: instance.user_id,
      agent_id: effectiveAgentId,
      tenant_id: instance.tenant_id || null,
      timestamp: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
      is_read: false,
    });

  if (insertError) {
    console.error('❌ Error saving Meta message:', insertError);
    return;
  }

  console.log('✅ Meta message saved:', { phone, text: messageText.substring(0, 50), type: mappedMessageType });

  // Mark as read on Meta side
  try {
    const markReadResp = await fetch(
      `https://graph.facebook.com/v21.0/${value.metadata.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instance.meta_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );
    await markReadResp.text(); // consume body
  } catch (e) {
    console.log('⚠️ Could not mark message as read on Meta:', e);
  }

  // 🤖 Trigger AI response via debounce - pass provider and Meta credentials
  await triggerAIDebounce(phone, messageText, { ...instance, effective_agent_id: effectiveAgentId });
}

async function triggerAIDebounce(
  phone: string,
  message: string,
  instance: {
    id: string;
    user_id: string;
    tenant_id: string | null;
    agent_id: string | null;
    instance_name: string;
    meta_access_token: string;
    meta_phone_number_id: string;
    effective_agent_id?: string | null;
  }
) {
  const agentIdForAI = instance.effective_agent_id ?? instance.agent_id;
  try {
    // Check if AI is disabled for this contact
    let disabledQuery = supabase
      .from('whatsapp_ai_disabled_contacts')
      .select('id')
      .eq('phone_number', phone);

    if (instance.tenant_id) {
      disabledQuery = disabledQuery.eq('tenant_id', instance.tenant_id);
    } else {
      disabledQuery = disabledQuery.is('tenant_id', null);
    }

    const { data: disabledContact } = await disabledQuery.maybeSingle();
    if (disabledContact) {
      console.log('⏭️ IA desabilitada para este contato');
      return;
    }

    // Check AI config - priority: agent > tenant > global
    let aiConfig: any = null;

    if (agentIdForAI) {
      const { data } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('agent_id', agentIdForAI)
        .maybeSingle();
      aiConfig = data;
    }

    if (!aiConfig) {
      let fallbackQuery = supabase
        .from('whatsapp_ai_config')
        .select('*')
        .is('agent_id', null);

      if (instance.tenant_id) {
        fallbackQuery = fallbackQuery.eq('tenant_id', instance.tenant_id);
      } else {
        fallbackQuery = fallbackQuery.is('tenant_id', null);
      }

      const { data } = await fallbackQuery.maybeSingle();
      aiConfig = data;
    }

    if (!aiConfig || !aiConfig.is_enabled) {
      console.log('⏭️ IA não habilitada');
      return;
    }

    console.log('🤖 IA habilitada, processando via debounce...');

    const delaySeconds = aiConfig.response_delay_seconds || 0;
    if (delaySeconds > 0) {
      // Use debounce system
      const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

      let existingQuery = supabase
        .from('whatsapp_ai_pending_responses')
        .select('id')
        .eq('phone', phone);

      if (instance.tenant_id) {
        existingQuery = existingQuery.eq('tenant_id', instance.tenant_id);
      } else {
        existingQuery = existingQuery.is('tenant_id', null);
      }

      const { data: existingPending } = await existingQuery.maybeSingle();

      if (existingPending) {
        await supabase
          .from('whatsapp_ai_pending_responses')
          .update({
            last_message: message,
            scheduled_at: scheduledAt,
            status: 'pending',
          })
          .eq('id', existingPending.id);
      } else {
        await supabase
          .from('whatsapp_ai_pending_responses')
          .insert({
            phone,
            tenant_id: instance.tenant_id,
            instance_id: instance.instance_name,
            last_message: message,
            scheduled_at: scheduledAt,
            status: 'pending',
            agent_id: agentIdForAI,
          });
      }

      // Dispatch debounce with provider info
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-ai-debounce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          phone,
          tenant_id: instance.tenant_id,
          instance_id: instance.instance_name,
          scheduled_at: scheduledAt,
          user_id: instance.user_id,
          delay_seconds: delaySeconds,
          agent_id: agentIdForAI,
          provider: 'meta',
          meta_phone_number_id: instance.meta_phone_number_id,
          meta_access_token: instance.meta_access_token,
        }),
      }).catch(e => console.error('❌ Error dispatching debounce:', e));

      console.log(`⏳ Debounce: ${delaySeconds}s para ${phone}`);
    } else {
      // Respond immediately - call the AI debounce function with Meta credentials
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-ai-debounce`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              trigger: 'immediate',
              phone,
              tenant_id: instance.tenant_id,
              provider: 'meta',
              meta_phone_number_id: instance.meta_phone_number_id,
              meta_access_token: instance.meta_access_token,
              agent_id: agentIdForAI,
              instance_id: instance.instance_name,
              user_id: instance.user_id,
            }),
          }
        );
        const respText = await response.text();
        console.log('🤖 AI debounce triggered:', response.status);
      } catch (e) {
        console.error('❌ Error triggering AI debounce:', e);
      }
    }
  } catch (error) {
    console.error('❌ Error in AI trigger:', error);
  }
}
