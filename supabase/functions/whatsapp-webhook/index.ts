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
    console.log('Z-API webhook received:', JSON.stringify(webhookData, null, 2));

    // Z-API webhook structure pode variar, vamos processar diferentes tipos
    const { type, data, instanceId } = webhookData;

    switch (type) {
      case 'message':
        // Nova mensagem recebida via Z-API
        if (data && data.phone && data.message) {
          console.log('Processing new message from Z-API');
          
          // Salvar mensagem no banco de dados
          await supabase.from('whatsapp_messages').insert({
            instance_name: instanceId || 'z-api-instance',
            message_id: data.messageId || data.id || Date.now().toString(),
            from_number: data.phone,
            message_text: data.message.text || data.message || '',
            message_type: 'received',
            timestamp: new Date().toISOString(),
            raw_data: data
          });

          // Verificar automações
          if (data.message && typeof data.message === 'string') {
            const messageText = data.message.toLowerCase();
            
            // Buscar automações ativas
            const { data: automations } = await supabase
              .from('whatsapp_automations')
              .select('*')
              .eq('is_active', true);

            if (automations) {
              for (const automation of automations) {
                if (messageText.includes(automation.trigger_keyword)) {
                  console.log('Triggering automation:', automation.trigger_keyword);
                  
                  // Enviar resposta automática
                  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send-message`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      phone: data.phone,
                      message: automation.response_message
                    })
                  });
                  
                  break; // Só executa a primeira automação encontrada
                }
              }
            }
          }
        }
        break;

      case 'status':
        // Atualização de status da conexão Z-API
        console.log('Z-API Status update:', data);
        
        await supabase.from('whatsapp_instances').upsert({
          instance_name: instanceId || 'z-api-instance',
          connection_status: data.connected ? 'connected' : 'disconnected',
          last_update: new Date().toISOString(),
          qr_code: data.qrCode || null
        });
        break;

      case 'qrcode':
        // QR Code atualizado
        console.log('Z-API QR Code updated');
        
        await supabase.from('whatsapp_instances').upsert({
          instance_name: instanceId || 'z-api-instance',
          qr_code: data.qrcode || data.value,
          connection_status: 'qr_code',
          last_update: new Date().toISOString()
        });
        break;

      default:
        console.log('Unhandled Z-API webhook event:', type);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Z-API webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});