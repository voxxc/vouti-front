import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone to international format (Brazil)
function formatPhoneNumber(phone: string): string {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code (55), return as is
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Add Brazil country code
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // Return original if format is unknown
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[whatsapp-process-queue] Starting queue processing...');

    // 1. Fetch pending messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_pending_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_at', { ascending: true })
      .limit(50); // Process max 50 messages per run

    if (fetchError) {
      console.error('[whatsapp-process-queue] Error fetching pending messages:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('[whatsapp-process-queue] No pending messages to process');
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: 'No pending messages' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[whatsapp-process-queue] Found ${pendingMessages.length} pending messages`);

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      processed++;

      // 2. Get Z-API credentials for this tenant (or Super Admin if tenant_id is NULL)
      let instance: any = null;
      let instanceError: any = null;

      // Suporta Super Admin (tenant_id NULL) e Tenants (tenant_id UUID)
      if (msg.tenant_id === null) {
        // Para Super Admin, buscar instância do agente marcado como landing_agent
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select(`
            instance_name, 
            zapi_instance_id, 
            zapi_instance_token, 
            zapi_client_token, 
            user_id,
            agent_id,
            whatsapp_agents!inner(is_landing_agent)
          `)
          .eq('connection_status', 'connected')
          .is('tenant_id', null)
          .eq('whatsapp_agents.is_landing_agent', true)
          .single();
        
        instance = data;
        instanceError = error;
      } else if (msg.lead_source === 'leads_captacao' && msg.lead_id) {
        // Para leads_captacao, buscar agente configurado para a origem específica
        const { data: leadData } = await supabase
          .from('leads_captacao')
          .select('origem')
          .eq('id', msg.lead_id)
          .single();

        if (leadData?.origem) {
          const { data, error } = await supabase
            .from('whatsapp_instances')
            .select(`
              instance_name, 
              zapi_instance_id, 
              zapi_instance_token, 
              zapi_client_token, 
              user_id,
              agent_id,
              whatsapp_agents!inner(landing_page_source)
            `)
            .eq('connection_status', 'connected')
            .eq('tenant_id', msg.tenant_id)
            .eq('whatsapp_agents.landing_page_source', leadData.origem)
            .single();

          instance = data;
          instanceError = error;
        }
      } else if (msg.lead_source === 'landing_leads' && msg.tenant_id) {
        // Para landing_leads de tenant, buscar instância do agente com landing_page_source configurado
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select(`
            instance_name, 
            zapi_instance_id, 
            zapi_instance_token, 
            zapi_client_token, 
            user_id,
            agent_id,
            whatsapp_agents!inner(landing_page_source)
          `)
          .eq('connection_status', 'connected')
          .eq('tenant_id', msg.tenant_id)
          .not('whatsapp_agents.landing_page_source', 'is', null)
          .limit(1)
          .maybeSingle();
        
        instance = data;
        instanceError = error;
      } else {
        // Para Tenants (outros tipos de lead), buscar qualquer instância conectada
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('instance_name, zapi_instance_id, zapi_instance_token, zapi_client_token, user_id, agent_id')
          .eq('connection_status', 'connected')
          .eq('tenant_id', msg.tenant_id)
          .limit(1)
          .maybeSingle();
        
        instance = data;
        instanceError = error;
      }

      if (instanceError || !instance) {
        console.error(`[whatsapp-process-queue] No Z-API instance found for tenant ${msg.tenant_id}`);
        
        await supabase
          .from('whatsapp_pending_messages')
          .update({ 
            status: 'failed',
            error_message: 'No connected WhatsApp instance found for tenant',
            attempts: msg.attempts + 1
          })
          .eq('id', msg.id);
        
        failed++;
        continue;
      }

      // 3. Format phone number
      const formattedPhone = formatPhoneNumber(msg.phone);
      console.log(`[whatsapp-process-queue] Sending to ${formattedPhone} (original: ${msg.phone})`);

      // 4. Send message via Z-API
      // Usar credenciais específicas da instância ou fallback para secrets globais
      const zapiInstanceId = instance.zapi_instance_id || Deno.env.get('Z_API_INSTANCE_ID');
      const zapiInstanceToken = instance.zapi_instance_token || Deno.env.get('Z_API_TOKEN');
      const zapiClientToken = instance.zapi_client_token; // Opcional

      if (!zapiInstanceId || !zapiInstanceToken) {
        console.error(`[whatsapp-process-queue] Missing Z-API credentials for tenant ${msg.tenant_id}`);
        await supabase
          .from('whatsapp_pending_messages')
          .update({ 
            status: 'failed',
            error_message: 'Missing Z-API credentials',
            attempts: msg.attempts + 1
          })
          .eq('id', msg.id);
        failed++;
        continue;
      }

      const sendUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-text`;

      // Headers - incluir Client-Token apenas se configurado
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (zapiClientToken) {
        headers['Client-Token'] = zapiClientToken;
      }

      try {
        const zapiResponse = await fetch(sendUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: formattedPhone,
            message: msg.message
          }),
        });

        const zapiData = await zapiResponse.json();
        console.log(`[whatsapp-process-queue] Z-API response for ${formattedPhone}:`, zapiData);

        if (zapiResponse.ok && (zapiData.messageId || zapiData.id || zapiData.zaapId)) {
          // 5. Update pending message as sent
          await supabase
            .from('whatsapp_pending_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: msg.attempts + 1
            })
            .eq('id', msg.id);

          // 6. Save to whatsapp_messages for history/inbox
          const { error: insertError } = await supabase
            .from('whatsapp_messages')
            .insert({
              instance_name: instance.instance_name,
              message_id: zapiData.messageId || zapiData.id || zapiData.zaapId || `auto_${Date.now()}`,
              from_number: formattedPhone,
              to_number: formattedPhone,
              message_text: msg.message,
              direction: 'outgoing',
              user_id: instance.user_id,
              tenant_id: msg.tenant_id,
              agent_id: instance.agent_id || null
            });

          if (insertError) {
            console.error(`[whatsapp-process-queue] ⚠️ Failed to save message to inbox:`, insertError);
          } else {
            console.log(`[whatsapp-process-queue] 📥 Message saved to inbox for ${formattedPhone}`);
          }

          // 7. Auto-insert card into Kanban (first non-Transferidos column)
          if (instance.agent_id) {
            try {
              // Find the first sales column (skip "Transferidos" at order 0)
              const { data: kanbanCol } = await supabase
                .from('whatsapp_kanban_columns')
                .select('id')
                .eq('agent_id', instance.agent_id)
                .gt('column_order', 0)
                .order('column_order', { ascending: true })
                .limit(1)
                .single();

              if (kanbanCol) {
                // Get next card_order
                const { count } = await supabase
                  .from('whatsapp_conversation_kanban')
                  .select('*', { count: 'exact', head: true })
                  .eq('column_id', kanbanCol.id);

                // Check if card already exists for this phone+agent
                const { data: existingCard } = await supabase
                  .from('whatsapp_conversation_kanban')
                  .select('id')
                  .eq('agent_id', instance.agent_id)
                  .eq('phone', formattedPhone)
                  .maybeSingle();

                if (!existingCard) {
                  const { error: kanbanError } = await supabase
                    .from('whatsapp_conversation_kanban')
                    .insert({
                      agent_id: instance.agent_id,
                      phone: formattedPhone,
                      column_id: kanbanCol.id,
                      card_order: (count || 0),
                      tenant_id: msg.tenant_id,
                    });

                  if (kanbanError) {
                    console.error(`[whatsapp-process-queue] ⚠️ Failed to create Kanban card:`, kanbanError);
                  } else {
                    console.log(`[whatsapp-process-queue] 📋 Kanban card created for ${formattedPhone}`);
                  }
                } else {
                  console.log(`[whatsapp-process-queue] 📋 Kanban card already exists for ${formattedPhone}`);
                }
              }
            } catch (kanbanErr) {
              console.error(`[whatsapp-process-queue] ⚠️ Kanban auto-insert error:`, kanbanErr);
            }
          }

          sent++;
          console.log(`[whatsapp-process-queue] ✅ Message sent to ${formattedPhone}`);
        } else {
          // Failed to send
          await supabase
            .from('whatsapp_pending_messages')
            .update({ 
              status: msg.attempts >= 2 ? 'failed' : 'pending',
              error_message: zapiData.message || zapiData.error || 'Unknown Z-API error',
              attempts: msg.attempts + 1
            })
            .eq('id', msg.id);

          failed++;
          console.error(`[whatsapp-process-queue] ❌ Failed to send to ${formattedPhone}:`, zapiData);
        }
      } catch (sendError) {
        console.error(`[whatsapp-process-queue] ❌ Network error sending to ${formattedPhone}:`, sendError);
        
        await supabase
          .from('whatsapp_pending_messages')
          .update({ 
            status: msg.attempts >= 2 ? 'failed' : 'pending',
            error_message: sendError instanceof Error ? sendError.message : 'Network error',
            attempts: msg.attempts + 1
          })
          .eq('id', msg.id);

        failed++;
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[whatsapp-process-queue] Completed: ${processed} processed, ${sent} sent, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      sent,
      failed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[whatsapp-process-queue] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
