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
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  // Se não começa com 55 (número sem código do país), adicionar
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

Deno.serve(async (req) => {
  // Meta Webhook Verification (GET request)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('🔐 Meta webhook verification:', { mode, token: token ? '[PROVIDED]' : '[MISSING]' });

    if (mode === 'subscribe' && token) {
      // Buscar instância pelo verify_token
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

    // Meta sends: { object: 'whatsapp_business_account', entry: [...] }
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

        // Resolve instance by meta_phone_number_id
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('id, user_id, tenant_id, agent_id, instance_name, meta_access_token')
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

    // Meta requires 200 response quickly
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Error processing Meta webhook:', error);
    // Still return 200 to prevent Meta from retrying
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
  },
  value: any
) {
  const from = message.from; // Sender's phone number
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

  // Save message to database
  const { error: insertError } = await supabase
    .from('whatsapp_messages')
    .insert({
      instance_name: instance.instance_name || instance.id,
      message_id: messageId || `meta_${Date.now()}`,
      from_number: phone,
      message_text: messageText,
      message_type: 'text',
      direction: 'received',
      raw_data: { message, contacts: value.contacts, metadata: value.metadata },
      user_id: instance.user_id,
      agent_id: instance.agent_id || null,
      tenant_id: instance.tenant_id || null,
      timestamp: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
      is_read: false,
    });

  if (insertError) {
    console.error('❌ Error saving Meta message:', insertError);
    return;
  }

  console.log('✅ Meta message saved:', { phone, text: messageText.substring(0, 50) });

  // Mark as read on Meta side
  try {
    await fetch(
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
  } catch (e) {
    console.log('⚠️ Could not mark message as read on Meta:', e);
  }

  // 🤖 Trigger AI response via debounce (same as Z-API flow)
  await triggerAIDebounce(phone, messageText, instance);
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
  }
) {
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

    if (instance.agent_id) {
      const { data } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('agent_id', instance.agent_id)
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
            agent_id: instance.agent_id,
          });
      }
      console.log(`⏳ Debounce: ${delaySeconds}s para ${phone}`);
    } else {
      // Respond immediately - call the AI debounce function
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-ai-debounce`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ trigger: 'immediate', phone, tenant_id: instance.tenant_id }),
          }
        );
        console.log('🤖 AI debounce triggered:', response.status);
      } catch (e) {
        console.error('❌ Error triggering AI debounce:', e);
      }
    }
  } catch (error) {
    console.error('❌ Error in AI trigger:', error);
  }
}
