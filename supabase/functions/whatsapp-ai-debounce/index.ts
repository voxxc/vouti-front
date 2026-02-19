import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.error('❌ Erro ao salvar mensagem enviada:', error);
  } else {
    console.log('✅ Mensagem enviada salva no histórico');
  }
}

// Send message via Meta WhatsApp Cloud API
async function sendViaMeta(
  phone: string,
  message: string,
  metaPhoneNumberId: string,
  metaAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${metaPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    const responseText = await response.text();
    console.log(`📡 Meta API [${response.status}]:`, responseText.substring(0, 200));
    return response.ok;
  } catch (e) {
    console.error('❌ Erro ao enviar via Meta API:', e);
    return false;
  }
}

// Send message via Z-API
async function sendViaZAPI(
  phone: string,
  message: string,
  instanceCredentials?: { zapi_instance_id?: string; zapi_instance_token?: string; zapi_client_token?: string }
): Promise<boolean> {
  let baseUrl: string | undefined;
  let clientToken: string | undefined;

  if (instanceCredentials?.zapi_instance_id && instanceCredentials?.zapi_instance_token) {
    baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
    clientToken = instanceCredentials.zapi_client_token || undefined;
    console.log('🔑 Debounce: usando credenciais da instância');
  } else {
    baseUrl = Deno.env.get('Z_API_URL');
    clientToken = Deno.env.get('Z_API_TOKEN');
    console.log('🔑 Debounce: usando credenciais globais');
  }

  if (!baseUrl) {
    console.error('❌ Debounce: nenhuma credencial Z-API disponível');
    return false;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;

    const sendResponse = await fetch(`${baseUrl}/send-text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, message }),
    });

    const responseText = await sendResponse.text();
    console.log(`📡 Z-API Debounce [${sendResponse.status}]:`, responseText.substring(0, 200));
    return sendResponse.ok;
  } catch (e) {
    console.error('❌ Erro ao enviar via Z-API:', e);
    return false;
  }
}

// Resolve instance provider and credentials from database
async function resolveInstanceProvider(instanceId: string, agentId?: string): Promise<{
  provider: string;
  meta_phone_number_id?: string;
  meta_access_token?: string;
  zapi_instance_id?: string;
  zapi_instance_token?: string;
  zapi_client_token?: string;
} | null> {
  // Try by instance_name first
  const { data } = await supabase
    .from('whatsapp_instances')
    .select('provider, meta_phone_number_id, meta_access_token, zapi_instance_id, zapi_instance_token, zapi_client_token')
    .eq('instance_name', instanceId)
    .limit(1)
    .maybeSingle();

  if (data) return data;

  // Fallback: try by agent_id
  if (agentId) {
    const { data: byAgent } = await supabase
      .from('whatsapp_instances')
      .select('provider, meta_phone_number_id, meta_access_token, zapi_instance_id, zapi_instance_token, zapi_client_token')
      .eq('agent_id', agentId)
      .limit(1)
      .maybeSingle();
    return byAgent || null;
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, tenant_id, instance_id, scheduled_at, user_id, delay_seconds, instance_credentials, agent_id, provider, meta_phone_number_id, meta_access_token } = await req.json();

    if (!phone || !instance_id || !scheduled_at) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`⏳ Debounce: aguardando ${delay_seconds}s para ${phone}`);

    // Aguardar o tempo configurado
    await new Promise(resolve => setTimeout(resolve, delay_seconds * 1000));

    // Verificar se o scheduled_at ainda bate (optimistic locking)
    let pendingQuery = supabase
      .from('whatsapp_ai_pending_responses')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending');

    if (tenant_id) {
      pendingQuery = pendingQuery.eq('tenant_id', tenant_id);
    } else {
      pendingQuery = pendingQuery.is('tenant_id', null);
    }

    const { data: pending } = await pendingQuery.maybeSingle();

    if (!pending) {
      console.log('⏭️ Debounce: registro pendente não encontrado, ignorando');
      return new Response(
        JSON.stringify({ success: true, action: 'skipped', reason: 'no_pending' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Comparar scheduled_at
    const pendingTime = new Date(pending.scheduled_at).getTime();
    const expectedTime = new Date(scheduled_at).getTime();
    if (Math.abs(pendingTime - expectedTime) > 1000) {
      console.log('⏭️ Debounce: timer resetado por nova mensagem, ignorando');
      return new Response(
        JSON.stringify({ success: true, action: 'skipped', reason: 'timer_reset' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar como processando
    await supabase
      .from('whatsapp_ai_pending_responses')
      .update({ status: 'processing' })
      .eq('id', pending.id);

    console.log('🤖 Debounce: timer expirou, processando IA para', phone);

    // Buscar a última mensagem recebida do contato
    let lastMsgQuery = supabase
      .from('whatsapp_messages')
      .select('message_text')
      .eq('from_number', phone)
      .eq('direction', 'received')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tenant_id) {
      lastMsgQuery = lastMsgQuery.eq('tenant_id', tenant_id);
    } else {
      lastMsgQuery = lastMsgQuery.is('tenant_id', null);
    }

    const { data: lastMsg } = await lastMsgQuery.maybeSingle();
    const messageText = lastMsg?.message_text || '';

    // Chamar a IA
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        phone,
        message: messageText,
        tenant_id,
        agent_id,
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiData.success || !aiData.response) {
      console.log('⏭️ IA não retornou resposta');
      await supabase
        .from('whatsapp_ai_pending_responses')
        .update({ status: 'done' })
        .eq('id', pending.id);
      return new Response(
        JSON.stringify({ success: true, action: 'no_ai_response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Resposta IA (debounce):', aiData.response.substring(0, 100));

    // Prefixar com nome do agente IA (se configurado)
    const aiAgentName = aiData.agent_name;
    const prefixedResponse = aiAgentName 
      ? `*${aiAgentName}*\n\n${aiData.response}` 
      : aiData.response;

    // Salvar mensagem da IA no banco IMEDIATAMENTE
    await saveOutgoingMessage(phone, prefixedResponse, tenant_id, instance_id, user_id, agent_id);

    // === ENVIO CONDICIONAL: Meta API vs Z-API ===
    
    // Determinar provider: usar dados passados no request OU buscar do banco
    let resolvedProvider = provider || null;
    let resolvedMetaPhoneNumberId = meta_phone_number_id || null;
    let resolvedMetaAccessToken = meta_access_token || null;
    let resolvedZapiCredentials = instance_credentials || null;

    // Se não veio provider no request, buscar do banco
    if (!resolvedProvider) {
      const instanceData = await resolveInstanceProvider(instance_id, agent_id);
      if (instanceData) {
        resolvedProvider = instanceData.provider;
        resolvedMetaPhoneNumberId = instanceData.meta_phone_number_id || null;
        resolvedMetaAccessToken = instanceData.meta_access_token || null;
        if (!resolvedZapiCredentials && instanceData.provider !== 'meta') {
          resolvedZapiCredentials = {
            zapi_instance_id: instanceData.zapi_instance_id,
            zapi_instance_token: instanceData.zapi_instance_token,
            zapi_client_token: instanceData.zapi_client_token,
          };
        }
      }
    }

    if (resolvedProvider === 'meta' && resolvedMetaPhoneNumberId && resolvedMetaAccessToken) {
      console.log('📤 Enviando resposta via Meta API');
      await sendViaMeta(phone, prefixedResponse, resolvedMetaPhoneNumberId, resolvedMetaAccessToken);
    } else {
      console.log('📤 Enviando resposta via Z-API');
      await sendViaZAPI(phone, prefixedResponse, resolvedZapiCredentials);
    }

    // Marcar como concluído
    await supabase
      .from('whatsapp_ai_pending_responses')
      .update({ status: 'done' })
      .eq('id', pending.id);

    return new Response(
      JSON.stringify({ success: true, action: 'processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no debounce:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
