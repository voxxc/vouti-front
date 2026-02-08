import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate webhook data structure
function validateWebhookData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.type || typeof data.type !== 'string') return false;
  if (!data.instanceId || typeof data.instanceId !== 'string') return false;
  if (data.instanceId.length > 100) return false;
  
  // Validate based on type
  if (data.type === 'ReceivedCallback' || data.type === 'message') {
    if (!data.phone || typeof data.phone !== 'string') return false;
    if (!/^\d{10,15}$/.test(data.phone)) return false; // Valid phone format
    if (data.text?.message && data.text.message.length > 10000) return false;
  }
  
  return true;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    
    // Validate input data
    if (!validateWebhookData(webhookData)) {
      console.error('Invalid webhook data received');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Received webhook data:', JSON.stringify(webhookData, null, 2));

    const { type, instanceId, fromMe } = webhookData;

    // Z-API envia webhooks com type: 'ReceivedCallback' para mensagens
    if (type === 'ReceivedCallback') {
      // Se fromMe = false, é mensagem recebida de contato
      if (!fromMe) {
        await handleIncomingMessage(webhookData);
      }
    } else if (type === 'message') {
      await handleIncomingMessage(webhookData);
    } else if (type === 'status') {
      await handleStatusUpdate(webhookData);
    } else if (type === 'qrcode') {
      await handleQRCodeUpdate(webhookData);
    } else {
      console.log(`Unhandled webhook type: ${type}`);
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
  const { instanceId, phone, messageId, text, chatName, momment, fromMe } = data;
  
  // ✅ Ignorar mensagens enviadas pelo próprio bot
  if (fromMe) {
    console.log('⏭️ Ignorando mensagem própria (fromMe: true)');
    return;
  }
  
  // Buscar user_id E tenant_id da instância
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('user_id, tenant_id, zapi_url, zapi_token')
    .eq('instance_name', instanceId)
    .single();

  if (instanceError || !instance?.user_id) {
    console.error('Instance not found or no user_id:', instanceError);
    return;
  }

  // Salvar mensagem com user_id E tenant_id
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
      tenant_id: instance.tenant_id,
      timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
      is_read: false
    });

  if (insertError) {
    console.error('Error saving message:', insertError);
    return;
  }

  console.log('✅ Mensagem salva:', { phone, text: text?.message });

  // 🤖 PRIMEIRO: Verificar se IA está habilitada para este tenant
  const aiHandled = await handleAIResponse(
    phone, 
    text?.message || '', 
    instance.tenant_id, 
    instance.zapi_url, 
    instance.zapi_token
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

      // Enviar resposta usando Z-API diretamente
      try {
        const zapiUrl = `${instance.zapi_url}/token/${instance.zapi_token}/send-text`;
        
        console.log('🔗 Enviando para Z-API:', zapiUrl.replace(instance.zapi_token, '***'));
        console.log('📱 Telefone destino:', phone);
        console.log('💬 Mensagem:', automation.response_message);
        
        const response = await fetch(zapiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            message: automation.response_message,
          }),
        });

        const responseData = await response.json();
        
        if (response.ok) {
          console.log(`✅ Resposta automática enviada:`, responseData);
        } else {
          console.error(`❌ Erro Z-API: ${response.status}`, responseData);
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
  zapi_url: string | null, 
  zapi_token: string | null
): Promise<boolean> {
  try {
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

    // Chamar Edge Function de IA
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

    // Enviar resposta via Z-API
    if (!zapi_url || !zapi_token) {
      console.error('❌ Z-API config não encontrada');
      return false;
    }

    const zapiUrl = `${zapi_url}/token/${zapi_token}/send-text`;
    
    const sendResponse = await fetch(zapiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message: aiData.response,
      }),
    });

    if (sendResponse.ok) {
      console.log('✅ Resposta IA enviada via Z-API');
      return true;
    } else {
      console.error('❌ Erro ao enviar resposta IA:', await sendResponse.text());
      return false;
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