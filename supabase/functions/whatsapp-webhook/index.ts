import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normaliza telefone brasileiro para formato com 9 dígitos
function normalizePhoneNumber(phone: string): string {
  // Remover sufixos do WhatsApp (@lid, @c.us, @s.whatsapp.net)
  let cleaned = phone.replace(/@.*$/, '').replace(/\D/g, '');
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  return cleaned;
}

// Detecta se um número é um LID (Linked ID) do WhatsApp, não um telefone real
function isLidNumber(phone: string): boolean {
  if (phone.includes('@lid')) return true;
  const digits = phone.replace(/\D/g, '');
  // LIDs geralmente não começam com 55 e têm formato diferente de telefone BR
  if (digits.length > 13 && !digits.startsWith('55')) return true;
  return false;
}

// Resolve o número real do destinatário quando a Z-API envia um LID
async function resolvePhoneFromLid(data: any, originalPhone: string): Promise<string | null> {
  // 1. Tentar extrair de chatId (formato: 5545999180026@c.us)
  if (data.chatId && typeof data.chatId === 'string') {
    const chatPhone = data.chatId.replace(/@.*$/, '').replace(/\D/g, '');
    if (chatPhone.startsWith('55') && chatPhone.length >= 12 && chatPhone.length <= 13) {
      console.log(`🔄 LID resolvido via chatId: ${originalPhone} -> ${chatPhone}`);
      return chatPhone;
    }
  }
  
  // 2. Tentar extrair de data.to
  if (data.to && typeof data.to === 'string') {
    const toPhone = data.to.replace(/@.*$/, '').replace(/\D/g, '');
    if (toPhone.startsWith('55') && toPhone.length >= 12 && toPhone.length <= 13) {
      console.log(`🔄 LID resolvido via 'to': ${originalPhone} -> ${toPhone}`);
      return toPhone;
    }
  }

  // 3. Fallback: buscar no banco a última mensagem recebida com esse chatLid
  const lidClean = originalPhone.replace(/@.*$/, '');
  const { data: match } = await supabase
    .from('whatsapp_messages')
    .select('from_number')
    .eq('direction', 'received')
    .or(`raw_data->>phone.eq.${lidClean},raw_data->>chatLid.eq.${lidClean}`)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (match?.from_number) {
    console.log(`🔄 LID resolvido via banco: ${originalPhone} -> ${match.from_number}`);
    return match.from_number;
  }

  console.warn(`⚠️ Não foi possível resolver LID: ${originalPhone}`);
  return null;
}

// Validate webhook data structure (permissive to accept all Z-API event types)
function validateWebhookData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.instanceId && !data.phone) return false; // Need at least one identifier
  if (data.instanceId && typeof data.instanceId !== 'string') return false;
  if (data.instanceId && data.instanceId.length > 100) return false;
  
  // Only validate phone format for message types that have it
  if (data.phone && typeof data.phone === 'string') {
    // Clean phone and validate - allow broader formats
    const cleanPhone = data.phone.replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) return false;
    if (data.text?.message && data.text.message.length > 10000) return false;
  }
  
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
  user_id?: string
) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      from_number: phone,  // Lead's phone to group in the same conversation
      message_text: message,
      direction: 'outgoing',
      tenant_id: tenant_id,
      instance_name: instance_name,
      message_id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_type: 'text',
      user_id: user_id || null,
      timestamp: new Date().toISOString(),
      is_read: true,  // Outgoing messages are already "read"
    });

  if (error) {
    console.error('❌ Erro ao salvar mensagem enviada:', error);
  } else {
    console.log('✅ Mensagem enviada salva no histórico');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    
    // Log raw payload BEFORE validation for diagnostics
    console.log('📩 Raw webhook payload:', JSON.stringify(webhookData).substring(0, 500));
    
    // Validate input data
    if (!validateWebhookData(webhookData)) {
      console.error('❌ Invalid webhook data received. Keys:', Object.keys(webhookData).join(', '));
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Received webhook:', webhookData.type, '| fromMe:', webhookData.fromMe, '| phone:', webhookData.phone);

    const { type, instanceId, fromMe } = webhookData;

    // Route based on webhook type - accept message-like types broadly
    if (type === 'ReceivedCallback' || type === 'message' || type === 'SentByMeCallback') {
      await handleIncomingMessage(webhookData);
    } else if (type === 'status' || type === 'MessageStatusCallback') {
      await handleStatusUpdate(webhookData);
    } else if (type === 'qrcode') {
      await handleQRCodeUpdate(webhookData);
    } else if (webhookData.phone && (webhookData.text || webhookData.fromMe !== undefined)) {
      // Fallback: any payload with phone + text/fromMe is likely a message
      console.log(`📨 Unknown type "${type}" but has phone/text, treating as message`);
      await handleIncomingMessage(webhookData);
    } else {
      console.log(`⏭️ Unhandled webhook type: ${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleIncomingMessage(data: any) {
  const { instanceId, phone: rawPhone, messageId, text, chatName, momment, fromMe } = data;
  
  // ✅ Resolver LID antes de normalizar
  let resolvedPhone = rawPhone;
  if (rawPhone && isLidNumber(rawPhone)) {
    console.log(`🔍 LID detectado: ${rawPhone}, buscando número real...`);
    const realPhone = await resolvePhoneFromLid(data, rawPhone);
    if (realPhone) {
      resolvedPhone = realPhone;
    } else {
      console.warn(`⚠️ Descartando mensagem: impossível resolver LID ${rawPhone}`);
      return;
    }
  }
  
  // ✅ Normalizar telefone ANTES de qualquer operação
  const phone = normalizePhoneNumber(resolvedPhone);
  if (phone !== rawPhone) {
    console.log(`📞 Telefone normalizado: ${rawPhone} -> ${phone}`);
  }
  
  // Buscar user_id, tenant_id E credenciais Z-API da instância
  // ✅ Busca pelo zapi_instance_id (ID real da Z-API que chega no webhook)
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('user_id, tenant_id, zapi_url, zapi_token, zapi_instance_id, zapi_instance_token, zapi_client_token, instance_name')
    .eq('zapi_instance_id', instanceId)
    .limit(1)
    .maybeSingle();

  if (instanceError || !instance?.user_id) {
    console.error('Instance not found or no user_id:', instanceError);
    return;
  }

  // Detectar se é instância do Super Admin (sem tenant_id)
  const effectiveTenantId = instance.tenant_id || null;

  // ✅ Mensagens enviadas por mim (fromMe: true)
  if (fromMe) {
    // Ignorar mensagens enviadas pela plataforma/API (já salvas via saveOutgoingMessage)
    if (data.fromApi) {
      console.log('⏭️ Ignorando mensagem já salva pela plataforma (fromApi: true)');
      return;
    }
    
    // Salvar mensagem enviada manualmente pelo celular como outgoing
    const { error: outErr } = await supabase
      .from('whatsapp_messages')
      .insert({
        instance_name: instanceId,
        message_id: messageId || `msg_${Date.now()}`,
        from_number: phone,
        message_text: text?.message || '',
        message_type: 'text',
        direction: 'outgoing',
        raw_data: data,
        user_id: instance.user_id,
        tenant_id: effectiveTenantId,
        timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
        is_read: true,
      });
    
    if (outErr) {
      console.error('❌ Erro ao salvar mensagem do celular:', outErr);
    } else {
      console.log('📱 Mensagem enviada pelo celular salva no histórico:', { phone, text: text?.message });
    }
    return;
  }
  
  // Salvar mensagem com user_id E tenant_id correto
  const { error: insertError } = await supabase
    .from('whatsapp_messages')
    .insert({
      instance_name: instanceId,
      message_id: messageId || `msg_${Date.now()}`,
      from_number: phone,
      message_text: text?.message || '',
      message_type: 'text',
      direction: 'received',
      raw_data: data,
      user_id: instance.user_id,
      tenant_id: effectiveTenantId,
      timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
      is_read: false
    });

  if (insertError) {
    console.error('Error saving message:', insertError);
    return;
  }

  console.log('✅ Mensagem salva:', { phone, text: text?.message });

  // 🤖 PRIMEIRO: Verificar se IA está habilitada para este tenant
  // Usa effectiveTenantId para suportar config IA do Super Admin (tenant_id = NULL)
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
    }
  );

  if (aiHandled) {
    console.log('🤖 Mensagem tratada pela IA');
    return;
  }

  // 📌 FALLBACK: Check for active automations (keyword-based)
  console.log('📥 Buscando automações para instance:', instanceId);
  const { data: automations, error: automationError } = await supabase
    .from('whatsapp_automations')
    .select('*')
    .eq('instance_name', instanceId)
    .eq('is_active', true);

  if (automationError) {
    console.error('Error fetching automations:', automationError);
    return;
  }

  console.log('🔍 Automações encontradas:', automations?.length || 0);
  console.log('💬 Texto da mensagem recebida:', text?.message);

  // Check if message matches any automation trigger
  for (const automation of automations || []) {
    const messageText = (text?.message || '').toLowerCase();
    const triggerKeyword = automation.trigger_keyword.toLowerCase();
    
    if (messageText.includes(triggerKeyword)) {
      console.log(`🤖 Automação disparada: ${automation.id} | Keyword: "${triggerKeyword}"`);
      
      if (!instance.zapi_url || !instance.zapi_token) {
        console.error('❌ Z-API config not found for instance');
        continue;
      }

      // Enviar resposta usando Z-API diretamente (usando secrets globais)
      try {
        const globalZapiUrl = Deno.env.get('Z_API_URL');
        const globalZapiToken = Deno.env.get('Z_API_TOKEN');
        
        if (!globalZapiUrl || !globalZapiToken) {
          console.error('❌ Z_API_URL ou Z_API_TOKEN não configurados');
          continue;
        }
        
        const apiEndpoint = `${globalZapiUrl}/send-text`;
        
        console.log('🔗 Enviando para Z-API:', apiEndpoint);
        console.log('📱 Telefone destino:', phone);
        console.log('💬 Mensagem:', automation.response_message.substring(0, 100));
        
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

        // Parse resposta com fallback para texto
        const responseText = await response.text();
        let responseData: any;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }
        
        console.log(`📡 Z-API Response [${response.status}]:`, JSON.stringify(responseData).substring(0, 200));
        
        if (response.ok) {
          console.log(`✅ Resposta automática enviada com sucesso`);
          
          // Save outgoing message to database
          await saveOutgoingMessage(
            phone,
            automation.response_message,
            instance.tenant_id,
            instanceId,
            instance.user_id
          );
        } else {
          console.error(`❌ Erro Z-API [${response.status}]:`, responseData);
        }
      } catch (error) {
        console.error('❌ Erro ao enviar resposta automática:', error);
      }
      
      break; // Only trigger first matching automation
    }
  }
}

// 🤖 Handler para resposta via IA
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
  }
): Promise<boolean> {
  try {
    // 🔒 PRIMEIRO: Verificar se IA está desabilitada para este contato específico
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
      console.log('⏭️ IA desabilitada para este contato (atendimento humano)');
      return false;
    }

    // Verificar se IA está habilitada para este tenant
    let query = supabase
      .from('whatsapp_ai_config')
      .select('*');

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data: aiConfig } = await query.maybeSingle();

    if (!aiConfig || !aiConfig.is_enabled) {
      console.log('⏭️ IA não habilitada para este tenant');
      return false;
    }

    console.log('🤖 IA habilitada, processando mensagem...');

    // ⏳ DEBOUNCE: Se delay configurado, usar sistema de timer
    const delaySeconds = aiConfig.response_delay_seconds || 0;
    if (delaySeconds > 0) {
      console.log(`⏳ Debounce ativado: ${delaySeconds}s para ${phone}`);
      
      const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
      
      // Manual upsert (onConflict não funciona com NULL tenant_id)
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
        console.error('❌ Erro ao criar timer debounce:', upsertError);
        // Fallback: responder imediatamente
      } else {
        // Fire-and-forget: disparar a função de debounce
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
          }),
        }).catch(err => console.error('❌ Erro ao disparar debounce:', err));

        console.log('📤 Debounce disparado, aguardando...');
        return true;
      }
    }

    // Chamar Edge Function de IA (resposta imediata)
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
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiData.success || !aiData.response) {
      console.log('⏭️ IA não retornou resposta');
      return false;
    }

    console.log('✅ Resposta IA:', aiData.response.substring(0, 100));

    // Salvar mensagem da IA no banco IMEDIATAMENTE (aparece na UI)
    await saveOutgoingMessage(
      phone,
      aiData.response,
      tenant_id,
      instanceId,
      user_id
    );
    console.log('💾 Mensagem IA salva no histórico');

    // Enviar resposta via Z-API usando credenciais da instância (prioridade) ou fallback global
    let baseUrl: string | undefined;
    let clientToken: string | undefined;
    
    // PRIORIDADE 1: Credenciais específicas da instância
    if (instanceCredentials.zapi_instance_id && instanceCredentials.zapi_instance_token) {
      baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
      clientToken = instanceCredentials.zapi_client_token || undefined;
      console.log('🔑 Usando credenciais específicas da instância');
    } 
    // PRIORIDADE 2: Fallback para secrets globais
    else {
      baseUrl = Deno.env.get('Z_API_URL');
      clientToken = Deno.env.get('Z_API_TOKEN');
      console.log('🔑 Usando credenciais globais (fallback)');
    }
    
    if (!baseUrl) {
      console.error('❌ Nenhuma credencial Z-API disponível (instância ou global)');
      return true; // Retorna true pois a mensagem foi salva
    }

    const apiEndpoint = `${baseUrl}/send-text`;
    console.log('🔗 Enviando resposta IA para Z-API:', apiEndpoint);
    
    // Construir headers - só adiciona Client-Token se existir
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

    // Parse resposta com fallback para texto
    const responseText = await sendResponse.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    console.log(`📡 Z-API IA Response [${sendResponse.status}]:`, JSON.stringify(responseData).substring(0, 200));

    if (sendResponse.ok) {
      console.log('✅ Resposta IA enviada via Z-API com sucesso');
      return true;
    } else {
      console.error(`❌ Erro ao enviar resposta IA [${sendResponse.status}]:`, responseData);
      return true; // Retorna true pois a mensagem já foi salva na UI
    }
  } catch (error) {
    console.error('❌ Erro no handler de IA:', error);
    return false;
  }
}

async function handleStatusUpdate(data: any) {
  const { instanceId, status } = data;
  
  // Update instance status
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
    console.error('Error updating instance status:', error);
  }
}

async function handleQRCodeUpdate(data: any) {
  const { instanceId, qrcode } = data;
  
  // Update QR code
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
    console.error('Error updating QR code:', error);
  }
}