import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 12) return cleaned;
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
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

    console.log('[process-campaigns] Starting...');

    // Fetch pending campaign messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_campaign_messages')
      .select('*, whatsapp_campaigns!inner(agent_id, tenant_id, status)')
      .eq('status', 'pending')
      .eq('whatsapp_campaigns.status', 'running')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-campaigns] Found ${pendingMessages.length} pending messages`);

    let sent = 0;
    let failed = 0;

    // Cache instances per agent
    const instanceCache = new Map<string, any>();

    for (const msg of pendingMessages) {
      const campaign = msg.whatsapp_campaigns as any;
      const agentId = campaign.agent_id;
      const tenantId = campaign.tenant_id;

      // Get instance (cached)
      if (!instanceCache.has(agentId)) {
        const { data: inst } = await supabase
          .from('whatsapp_instances')
          .select('instance_name, zapi_instance_id, zapi_instance_token, zapi_client_token, user_id, agent_id')
          .eq('agent_id', agentId)
          .eq('connection_status', 'connected')
          .limit(1)
          .maybeSingle();
        instanceCache.set(agentId, inst);
      }

      const instance = instanceCache.get(agentId);
      if (!instance) {
        await supabase
          .from('whatsapp_campaign_messages')
          .update({ status: 'failed', error_message: 'No connected instance' })
          .eq('id', msg.id);
        failed++;
        continue;
      }

      const zapiId = instance.zapi_instance_id || Deno.env.get('Z_API_INSTANCE_ID');
      const zapiToken = instance.zapi_instance_token || Deno.env.get('Z_API_TOKEN');

      if (!zapiId || !zapiToken) {
        await supabase
          .from('whatsapp_campaign_messages')
          .update({ status: 'failed', error_message: 'Missing Z-API credentials' })
          .eq('id', msg.id);
        failed++;
        continue;
      }

      const formattedPhone = formatPhoneNumber(msg.phone);
      const sendUrl = `https://api.z-api.io/instances/${zapiId}/token/${zapiToken}/send-text`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (instance.zapi_client_token) headers['Client-Token'] = instance.zapi_client_token;

      try {
        const resp = await fetch(sendUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: formattedPhone, message: msg.message }),
        });

        const data = await resp.json();

        if (resp.ok && (data.messageId || data.id || data.zaapId)) {
          await supabase
            .from('whatsapp_campaign_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', msg.id);

          // Update campaign counters
          await supabase.rpc('', {}).catch(() => {});
          await supabase
            .from('whatsapp_campaigns')
            .update({ sent_count: (campaign as any).sent_count ? (campaign as any).sent_count + 1 : 1 })
            .eq('id', msg.campaign_id);

          // Save to whatsapp_messages for inbox
          await supabase.from('whatsapp_messages').insert({
            instance_name: instance.instance_name,
            message_id: data.messageId || data.id || data.zaapId || `campaign_${Date.now()}`,
            from_number: formattedPhone,
            to_number: formattedPhone,
            message_text: msg.message,
            direction: 'outgoing',
            user_id: instance.user_id,
            tenant_id: tenantId,
            agent_id: instance.agent_id,
          });

          sent++;
        } else {
          await supabase
            .from('whatsapp_campaign_messages')
            .update({ status: 'failed', error_message: data.message || 'Z-API error' })
            .eq('id', msg.id);
          failed++;
        }
      } catch (err) {
        await supabase
          .from('whatsapp_campaign_messages')
          .update({ status: 'failed', error_message: err instanceof Error ? err.message : 'Network error' })
          .eq('id', msg.id);
        failed++;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Update campaign counters properly
    const campaignIds = [...new Set(pendingMessages.map(m => m.campaign_id))];
    for (const cid of campaignIds) {
      const { data: counts } = await supabase
        .from('whatsapp_campaign_messages')
        .select('status')
        .eq('campaign_id', cid);

      if (counts) {
        const sentCount = counts.filter(c => c.status === 'sent').length;
        const failedCount = counts.filter(c => c.status === 'failed').length;
        const pendingCount = counts.filter(c => c.status === 'pending').length;

        await supabase
          .from('whatsapp_campaigns')
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            status: pendingCount === 0 ? 'completed' : 'running',
          })
          .eq('id', cid);
      }
    }

    console.log(`[process-campaigns] Done: ${sent} sent, ${failed} failed`);

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-campaigns] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
