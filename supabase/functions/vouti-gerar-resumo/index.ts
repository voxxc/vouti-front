import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processo_oab_id } = await req.json();

    if (!processo_oab_id) {
      return new Response(
        JSON.stringify({ error: "processo_oab_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com service role para acessar dados
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados do processo
    const { data: processo, error: processoError } = await supabase
      .from("processos_oab")
      .select("*")
      .eq("id", processo_oab_id)
      .single();

    if (processoError || !processo) {
      console.error("Erro ao buscar processo:", processoError);
      return new Response(
        JSON.stringify({ error: "Processo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar movimentações do processo
    const { data: movimentacoes } = await supabase
      .from("processo_movimentacoes")
      .select("data, descricao, tipo")
      .eq("processo_id", processo_oab_id)
      .order("data", { ascending: false })
      .limit(20);

    // Montar contexto para a IA
    const contextoParts = [];

    // Informações básicas do processo
    contextoParts.push(`PROCESSO: ${processo.numero_processo || processo.numero_cnj || "Sem número"}`);
    
    if (processo.tribunal) contextoParts.push(`Tribunal: ${processo.tribunal}`);
    if (processo.classe) contextoParts.push(`Classe: ${processo.classe}`);
    if (processo.assuntos) contextoParts.push(`Assuntos: ${JSON.stringify(processo.assuntos)}`);
    if (processo.valor_causa) contextoParts.push(`Valor da Causa: R$ ${processo.valor_causa}`);
    
    // Partes
    if (processo.partes && Array.isArray(processo.partes)) {
      const partesAtivas = processo.partes.filter((p: any) => p.polo === "ATIVO" || p.polo === "ativo");
      const partesPassivas = processo.partes.filter((p: any) => p.polo === "PASSIVO" || p.polo === "passivo");
      
      if (partesAtivas.length > 0) {
        contextoParts.push(`Polo Ativo: ${partesAtivas.map((p: any) => p.nome).join(", ")}`);
      }
      if (partesPassivas.length > 0) {
        contextoParts.push(`Polo Passivo: ${partesPassivas.map((p: any) => p.nome).join(", ")}`);
      }
    }

    // Movimentações recentes
    if (movimentacoes && movimentacoes.length > 0) {
      contextoParts.push("\nÚLTIMAS MOVIMENTAÇÕES:");
      movimentacoes.slice(0, 10).forEach((m: any) => {
        const data = m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "Sem data";
        contextoParts.push(`- [${data}] ${m.descricao?.substring(0, 200) || "Sem descrição"}`);
      });
    }

    const contexto = contextoParts.join("\n");

    console.log("Gerando resumo para processo:", processo_oab_id);
    console.log("Contexto montado com", contextoParts.length, "partes");

    // Chamar Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente jurídico especializado em análise de processos judiciais brasileiros.
Sua tarefa é analisar os dados do processo e gerar um resumo executivo claro e objetivo.

O resumo deve conter:
1. **Síntese do Caso**: Um parágrafo resumindo do que se trata o processo
2. **Partes Envolvidas**: Quem são os litigantes e seus papéis
3. **Situação Atual**: Status atual do processo baseado nas últimas movimentações
4. **Pontos de Atenção**: Alertas ou itens que requerem ação do advogado

Use linguagem profissional e objetiva. Seja conciso mas completo.
Formate usando markdown para melhor legibilidade.`,
          },
          {
            role: "user",
            content: `Analise o seguinte processo e gere um resumo executivo:\n\n${contexto}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro na API de IA:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao gerar resumo com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content;

    if (!resumo) {
      console.error("Resposta da IA sem conteúdo:", aiData);
      return new Response(
        JSON.stringify({ error: "IA não retornou um resumo válido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dados estruturados para salvar
    const summaryData = {
      generated_at: new Date().toISOString(),
      model: "google/gemini-2.5-flash",
      movimentacoes_analisadas: movimentacoes?.length || 0,
      processo_numero: processo.numero_processo || processo.numero_cnj,
    };

    // Salvar resumo no processo
    const { error: updateError } = await supabase
      .from("processos_oab")
      .update({
        ai_summary: resumo,
        ai_summary_data: summaryData,
        ai_enabled: true,
      })
      .eq("id", processo_oab_id);

    if (updateError) {
      console.error("Erro ao salvar resumo:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar resumo no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resumo gerado e salvo com sucesso para processo:", processo_oab_id);

    return new Response(
      JSON.stringify({
        success: true,
        ai_summary: resumo,
        ai_summary_data: summaryData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função vouti-gerar-resumo:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
