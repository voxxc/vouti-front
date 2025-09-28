import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('WhatsApp webhook received:', JSON.stringify(webhookData, null, 2));

    const { event, instance, data } = webhookData;

    // Processar diferentes tipos de eventos
    switch (event) {
      case 'messages.upsert':
        // Nova mensagem recebida
        if (data.messages && data.messages.length > 0) {
          const message = data.messages[0];
          
          // Salvar mensagem no banco de dados
          await supabase.from('whatsapp_messages').insert({
            instance_name: instance,
            message_id: message.key.id,
            from_number: message.key.remoteJid,
            message_text: message.message?.conversation || message.message?.extendedTextMessage?.text || '',
            message_type: 'received',
            timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
            raw_data: message
          });

          // Automação: resposta automática para mensagens específicas
          if (message.message?.conversation) {
            const messageText = message.message.conversation.toLowerCase();
            
            if (messageText.includes('ola') || messageText.includes('oi')) {
              // Enviar resposta automática
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send-message`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  instanceName: instance,
                  number: message.key.remoteJid,
                  message: 'Olá! Obrigado por entrar em contato. Como posso ajudá-lo?'
                })
              });
            }
          }
        }
        break;

      case 'connection.update':
        // Atualização de status da conexão
        console.log('Connection update:', data);
        
        // Salvar status no banco
        await supabase.from('whatsapp_instances').upsert({
          instance_name: instance,
          connection_status: data.state || 'unknown',
          last_update: new Date().toISOString(),
          qr_code: data.qr || null
        });
        break;

      case 'qr.updated':
        // QR Code atualizado
        console.log('QR Code updated for instance:', instance);
        
        await supabase.from('whatsapp_instances').upsert({
          instance_name: instance,
          qr_code: data.qr,
          connection_status: 'qr_code',
          last_update: new Date().toISOString()
        });
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});