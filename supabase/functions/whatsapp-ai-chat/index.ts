import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const grokApiKey = Deno.env.get('GROK_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, tenant_id, instance_name, agent_id } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📥 AI Chat request:', { phone, message: message.substring(0, 50), tenant_id, agent_id });

    // Buscar configuração de IA - prioridade: agent_id > tenant_id > global
    let aiConfig: any = null;
    let configError: any = null;

    // 1) Config específica do agente
    if (agent_id) {
      const { data, error } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('agent_id', agent_id)
        .maybeSingle();
      aiConfig = data;
      configError = error;
    }

    // 2) Fallback: config do tenant (sem agent_id)
    if (!aiConfig && !configError && !agent_id) {
      let fallbackQuery = supabase
        .from('whatsapp_ai_config')
        .select('*')
        .is('agent_id', null);

      if (tenant_id) {
        fallbackQuery = fallbackQuery.eq('tenant_id', tenant_id);
      } else {
        fallbackQuery = fallbackQuery.is('tenant_id', null);
      }

      const { data, error } = await fallbackQuery.maybeSingle();
      aiConfig = data;
      configError = error;
    }

    if (configError) {
      console.error('❌ Erro ao buscar config:', configError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch AI config', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiConfig || !aiConfig.is_enabled) {
      console.log('⏭️ IA não habilitada para este tenant');
      return new Response(
        JSON.stringify({ success: false, reason: 'AI not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Config IA encontrada:', { 
      agent: aiConfig.agent_name, 
      model: aiConfig.model_name,
      temperature: aiConfig.temperature 
    });

    // Buscar histórico de mensagens para contexto
    let historyQuery = supabase
      .from('whatsapp_messages')
      .select('message_text, direction, created_at')
      .eq('from_number', phone)
      .order('created_at', { ascending: false })
      .limit(aiConfig.max_history || 10);

    if (tenant_id) {
      historyQuery = historyQuery.eq('tenant_id', tenant_id);
    } else {
      historyQuery = historyQuery.is('tenant_id', null);
    }

    const { data: historyData } = await historyQuery;

    // Montar mensagens para a IA
    const messages: Message[] = [
      {
        role: 'system',
        content: aiConfig.system_prompt || 'Você é um assistente virtual prestativo.'
      }
    ];

    // Adicionar histórico em ordem cronológica
    if (historyData && historyData.length > 0) {
      const sortedHistory = [...historyData].reverse();
      for (const msg of sortedHistory) {
        messages.push({
          role: msg.direction === 'received' ? 'user' : 'assistant',
          content: msg.message_text || ''
        });
      }
    }

    // Adicionar mensagem atual
    messages.push({
      role: 'user',
      content: message
    });

    console.log('📤 Enviando para Lovable AI:', { 
      model: aiConfig.model_name,
      messagesCount: messages.length 
    });

    // Determinar provider (Lovable AI ou Grok)
    let apiUrl: string;
    let apiKey: string;

    if (aiConfig.ai_provider === 'grok') {
      if (!grokApiKey) {
        console.error('❌ GROK_API_KEY não configurada');
        return new Response(
          JSON.stringify({ error: 'GROK_API_KEY not configured', success: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiUrl = 'https://api.x.ai/v1/chat/completions';
      apiKey = grokApiKey;
    } else {
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      apiKey = lovableApiKey;
    }

    console.log(`🔀 Provider: ${aiConfig.ai_provider || 'lovable'}, URL: ${apiUrl}`);

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model_name || 'google/gemini-3-flash-preview',
        messages,
        temperature: aiConfig.temperature || 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', success: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI gateway error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content;

    if (!responseText) {
      console.error('❌ Resposta vazia da IA');
      return new Response(
        JSON.stringify({ error: 'Empty AI response', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Resposta IA gerada:', responseText.substring(0, 100));

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: responseText,
        agent_name: aiConfig.agent_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
