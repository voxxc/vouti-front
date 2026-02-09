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
  user_id?: string
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
      timestamp: new Date().toISOString(),
      is_read: true,
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
    const { phone, tenant_id, instance_id, scheduled_at, user_id, delay_seconds, instance_credentials } = await req.json();

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

    // Comparar scheduled_at - se mudou, outra mensagem chegou e resetou o timer
    if (pending.scheduled_at !== scheduled_at) {
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

    // Buscar a última mensagem recebida do contato para enviar à IA
    // (a IA já usa histórico interno, então basta enviar a última mensagem como trigger)
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

    // Salvar mensagem da IA no banco IMEDIATAMENTE
    await saveOutgoingMessage(phone, aiData.response, tenant_id, instance_id, user_id);

    // Enviar via Z-API
    let baseUrl: string | undefined;
    let clientToken: string | undefined;

    if (instance_credentials?.zapi_instance_id && instance_credentials?.zapi_instance_token) {
      baseUrl = `https://api.z-api.io/instances/${instance_credentials.zapi_instance_id}/token/${instance_credentials.zapi_instance_token}`;
      clientToken = instance_credentials.zapi_client_token || undefined;
      console.log('🔑 Debounce: usando credenciais da instância');
    } else {
      baseUrl = Deno.env.get('Z_API_URL');
      clientToken = Deno.env.get('Z_API_TOKEN');
      console.log('🔑 Debounce: usando credenciais globais');
    }

    if (baseUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientToken) headers['Client-Token'] = clientToken;

      const sendResponse = await fetch(`${baseUrl}/send-text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, message: aiData.response }),
      });

      const responseText = await sendResponse.text();
      console.log(`📡 Z-API Debounce [${sendResponse.status}]:`, responseText.substring(0, 200));
    } else {
      console.error('❌ Debounce: nenhuma credencial Z-API disponível');
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
