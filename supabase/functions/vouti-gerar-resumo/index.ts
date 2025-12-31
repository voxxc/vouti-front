import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const JUDIT_API_KEY = Deno.env.get("JUDIT_API_KEY");
    if (!JUDIT_API_KEY) {
      console.error("JUDIT_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Configuração não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados do processo
    const { data: processo, error: processoError } = await supabase
      .from("processos_oab")
      .select("id, numero_cnj, tenant_id")
      .eq("id", processo_oab_id)
      .single();

    if (processoError || !processo) {
      console.error("Erro ao buscar processo:", processoError);
      return new Response(
        JSON.stringify({ error: "Processo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!processo.numero_cnj) {
      return new Response(
        JSON.stringify({ error: "Processo sem número CNJ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numeroCnj = processo.numero_cnj.replace(/\D/g, "");
    console.log("Solicitando resumo IA para CNJ:", numeroCnj);

    // Fazer POST para a API Judit
    const postResponse = await fetch("https://requests.prod.judit.io/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": JUDIT_API_KEY,
      },
      body: JSON.stringify({
        search: {
          search_type: "lawsuit_cnj",
          search_key: numeroCnj,
          response_type: "lawsuit+summary",
        },
      }),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error("Erro ao solicitar processo na Judit:", postResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao solicitar dados do processo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postData = await postResponse.json();
    const requestId = postData.request_id;

    if (!requestId) {
      console.error("Resposta da Judit sem request_id:", postData);
      return new Response(
        JSON.stringify({ error: "Resposta inválida do serviço" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request ID obtido:", requestId);

    // Polling para obter a resposta
    let summaryData = null;
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      await sleep(2000);

      console.log(`Tentativa ${attempts}/${maxAttempts} de obter resposta...`);

      const getResponse = await fetch(
        `https://requests.prod.judit.io/responses?request_id=${requestId}`,
        {
          headers: {
            "api-key": JUDIT_API_KEY,
          },
        }
      );

      if (!getResponse.ok) {
        console.error("Erro ao consultar resposta:", getResponse.status);
        continue;
      }

      const getData = await getResponse.json();
      const pageData = getData.page_data || [];

      // Procurar pelo response_type === 'summary'
      for (const item of pageData) {
        if (item.response_type === "summary") {
          summaryData = item.response_data;
          console.log("Summary encontrado!");
          break;
        }
      }

      if (summaryData) break;

      // Se não encontrou summary mas tem dados, pode ser que ainda está processando
      if (pageData.length === 0) {
        console.log("Ainda sem dados, aguardando...");
      }
    }

    if (!summaryData) {
      console.error("Timeout ao aguardar resumo da Judit");
      return new Response(
        JSON.stringify({ error: "Timeout ao gerar resumo. Tente novamente." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair o resumo do summaryData
    // A estrutura pode variar, tentamos algumas possibilidades
    let aiSummary = "";
    
    if (typeof summaryData === "string") {
      aiSummary = summaryData;
    } else if (summaryData.summary) {
      aiSummary = summaryData.summary;
    } else if (summaryData.data && Array.isArray(summaryData.data) && summaryData.data.length > 0) {
      aiSummary = summaryData.data[0];
    } else if (summaryData.text) {
      aiSummary = summaryData.text;
    } else {
      // Tentar converter o objeto inteiro para string legível
      aiSummary = JSON.stringify(summaryData, null, 2);
    }

    if (!aiSummary) {
      console.error("Não foi possível extrair resumo:", summaryData);
      return new Response(
        JSON.stringify({ error: "Resumo não disponível" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dados estruturados para salvar
    const aiSummaryData = {
      generated_at: new Date().toISOString(),
      request_id: requestId,
      source: "judit",
    };

    // Salvar resumo no processo
    const { error: updateError } = await supabase
      .from("processos_oab")
      .update({
        ai_summary: aiSummary,
        ai_summary_data: aiSummaryData,
        ai_enabled: true,
      })
      .eq("id", processo_oab_id);

    if (updateError) {
      console.error("Erro ao salvar resumo:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resumo gerado e salvo com sucesso para processo:", processo_oab_id);

    return new Response(
      JSON.stringify({
        success: true,
        ai_summary: aiSummary,
        ai_summary_data: aiSummaryData,
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
