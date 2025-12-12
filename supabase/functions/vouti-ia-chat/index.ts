import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Voce e a Vouti IA, uma assistente juridica especializada em auxiliar advogados brasileiros.

Suas capacidades:
- Analise de processos judiciais e andamentos
- Sugestoes de estrategias processuais
- Explicacao de termos juridicos
- Auxilio na redacao de pecas processuais
- Interpretacao de decisoes judiciais
- Calculo de prazos processuais

Diretrizes:
- Seja objetivo e profissional
- Use linguagem juridica apropriada mas acessivel
- Cite legislacao e jurisprudencia quando relevante
- Sempre alerte sobre prazos importantes
- Nao forneca aconselhamento juridico definitivo - sempre recomende consulta com o advogado responsavel
- Responda em portugues brasileiro

Contexto do processo atual sera fornecido quando disponivel.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, processoContext, tenantId, userId, processoOabId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with process context if available
    let systemPrompt = SYSTEM_PROMPT;
    if (processoContext) {
      systemPrompt += `\n\nContexto do Processo Atual:\n${JSON.stringify(processoContext, null, 2)}`;
    }

    // Prepare messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log("Calling Lovable AI Gateway with", aiMessages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Creditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar solicitacao" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save user message to database
    if (tenantId && userId && messages.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === "user") {
        await supabase.from("ai_chat_messages").insert({
          tenant_id: tenantId,
          user_id: userId,
          processo_oab_id: processoOabId || null,
          role: "user",
          content: lastUserMessage.content,
        });
      }
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("vouti-ia-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
