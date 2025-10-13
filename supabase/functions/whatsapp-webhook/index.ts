import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const { instanceId, phone, messageId, text, chatName, momment } = data;
  
  // Buscar user_id da instância
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('user_id')
    .eq('instance_name', instanceId)
    .single();

  if (instanceError || !instance?.user_id) {
    console.error('Instance not found or no user_id:', instanceError);
    return;
  }

  // Salvar mensagem com user_id
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
      timestamp: momment ? new Date(momment).toISOString() : new Date().toISOString(),
      is_read: false
    });

  if (insertError) {
    console.error('Error saving message:', insertError);
    return;
  }

  console.log('✅ Mensagem salva:', { phone, text: text?.message });

  // Check for active automations
  const { data: automations, error: automationError } = await supabase
    .from('whatsapp_automations')
    .select('*')
    .eq('instance_name', instanceId)
    .eq('is_active', true);

  if (automationError) {
    console.error('Error fetching automations:', automationError);
    return;
  }

  // Check if message matches any automation trigger
  for (const automation of automations || []) {
    const messageText = (message.body || '').toLowerCase();
    const triggerKeyword = automation.trigger_keyword.toLowerCase();
    
    if (messageText.includes(triggerKeyword)) {
      console.log(`Automation triggered: ${automation.id}`);
      
      // Send automated response via whatsapp-send-message function
      try {
        await supabase.functions.invoke('whatsapp-send-message', {
          body: {
            phone: message.from,
            message: automation.response_message,
            messageType: 'text'
          }
        });
        
        console.log(`Automated response sent to ${message.from}`);
      } catch (error) {
        console.error('Error sending automated response:', error);
      }
      
      break; // Only trigger first matching automation
    }
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