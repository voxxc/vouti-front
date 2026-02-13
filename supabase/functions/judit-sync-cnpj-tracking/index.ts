import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpjId } = await req.json();

    if (!cnpjId) {
      throw new Error("cnpjId é obrigatório");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const juditApiKey = Deno.env.get("JUDIT_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar CNPJ e tracking_id
    const { data: cnpjData, error: cnpjError } = await supabase
      .from("cnpjs_cadastrados")
      .select("*")
      .eq("id", cnpjId)
      .single();

    if (cnpjError || !cnpjData) {
      throw new Error("CNPJ não encontrado");
    }

    const trackingId = cnpjData.tracking_id;
    if (!trackingId) {
      throw new Error(
        "Este CNPJ não possui monitoramento ativo. Ative o monitoramento primeiro."
      );
    }

    const tenantId = cnpjData.tenant_id;
    const userId = cnpjData.user_id;

    console.log(
      `[Sync CNPJ Tracking] Iniciando sync via tracking_id: ${trackingId}`
    );

    // 2. GET /tracking/{tracking_id} para obter request_id
    const trackingResponse = await fetch(
      `https://tracking.prod.judit.io/tracking/${trackingId}`,
      {
        method: "GET",
        headers: {
          "api-key": juditApiKey.trim(),
          "Content-Type": "application/json",
        },
      }
    );

    if (!trackingResponse.ok) {
      const errorBody = await trackingResponse.text();
      console.error(
        "[Sync CNPJ Tracking] Erro ao buscar tracking:",
        trackingResponse.status,
        errorBody
      );
      
      if (trackingResponse.status === 404) {
        throw new Error(
          "Tracking não encontrado na Judit. O monitoramento pode ter sido removido externamente. Desative e reative o monitoramento."
        );
      }
      
      throw new Error(
        `Erro ao consultar tracking: ${trackingResponse.status}`
      );
    }

    const trackingData = await trackingResponse.json();
    
    console.log("[Sync CNPJ Tracking] Tracking data keys:", Object.keys(trackingData));

    // Extrair request_id - múltiplos formatos possíveis
    let requestId: string | null = null;
    
    if (trackingData.page_data && trackingData.page_data.length > 0) {
      requestId = trackingData.page_data[0].request_id;
    } else if (trackingData.request_id) {
      requestId = trackingData.request_id;
    } else if (trackingData.last_request_id) {
      requestId = trackingData.last_request_id;
    }

    if (!requestId) {
      console.log(
        "[Sync CNPJ Tracking] Tracking sem request_id. Dados:",
        JSON.stringify(trackingData).substring(0, 500)
      );
      throw new Error(
        "O monitoramento ainda não gerou resultados. Aguarde a próxima execução."
      );
    }

    console.log(
      `[Sync CNPJ Tracking] Request ID obtido do tracking: ${requestId}`
    );

    // 3. GET /responses?request_id={request_id} (paginado)
    let allProcessos: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages && currentPage <= 50) {
      const responsesUrl = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=${currentPage}&page_size=100`;
      const responsesRes = await fetch(responsesUrl, {
        method: "GET",
        headers: { "api-key": juditApiKey.trim() },
      });

      if (!responsesRes.ok) {
        const errText = await responsesRes.text();
        console.error(
          `[Sync CNPJ Tracking] Erro ao buscar responses página ${currentPage}:`,
          errText
        );
        break;
      }

      const responsesData = await responsesRes.json();

      if (currentPage === 1) {
        totalPages = responsesData.total_pages || 1;
        console.log(
          `[Sync CNPJ Tracking] Total de páginas: ${totalPages}`
        );
      }

      if (responsesData.page_data && responsesData.page_data.length > 0) {
        allProcessos = allProcessos.concat(responsesData.page_data);
        currentPage++;
        if (currentPage <= totalPages) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } else {
        break;
      }
    }

    console.log(
      `[Sync CNPJ Tracking] Total de processos encontrados: ${allProcessos.length}`
    );

    if (allProcessos.length === 0) {
      // Atualizar request_id mesmo sem processos
      await supabase
        .from("cnpjs_cadastrados")
        .update({
          ultimo_request_id: requestId,
          request_id_data: new Date().toISOString(),
          ultima_sincronizacao: new Date().toISOString(),
        })
        .eq("id", cnpjId);

      // Log
      await supabase.from("judit_api_logs").insert({
        tenant_id: tenantId,
        user_id: userId,
        tipo_chamada: "sync-tracking-cnpj",
        endpoint: `/tracking/${trackingId}`,
        metodo: "GET",
        request_id: requestId,
        sucesso: true,
        resposta_status: 200,
        custo_estimado: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          requestId,
          processosEncontrados: 0,
          message: "Nenhum processo encontrado nesta sincronização",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Processar e salvar processos (mesma lógica do judit-sincronizar-cnpj)
    let processosNovos = 0;
    let processosAtualizados = 0;

    for (const item of allProcessos) {
      const responseData = item.response_data;
      if (!responseData) continue;

      const numeroCnj = responseData.code;
      if (!numeroCnj) continue;

      // Extrair partes
      let parteAtiva = "";
      let partePassiva = "";
      const parties = responseData.parties || [];

      const autores = parties
        .filter((p: any) => {
          const tipo = (p.person_type || p.tipo || "").toUpperCase();
          const side = (p.side || "").toLowerCase();
          const papel = (p.role || p.papel || "").toLowerCase();
          return (
            side === "active" ||
            side === "plaintiff" ||
            side === "author" ||
            tipo.includes("ATIVO") ||
            tipo.includes("AUTOR") ||
            tipo.includes("REQUERENTE") ||
            tipo.includes("EXEQUENTE") ||
            papel.includes("autor") ||
            papel.includes("requerente") ||
            papel.includes("ativo")
          );
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);

      const reus = parties
        .filter((p: any) => {
          const tipo = (p.person_type || p.tipo || "").toUpperCase();
          const side = (p.side || "").toLowerCase();
          const papel = (p.role || p.papel || "").toLowerCase();
          return (
            side === "passive" ||
            side === "defendant" ||
            tipo.includes("PASSIVO") ||
            tipo.includes("REU") ||
            tipo.includes("RÉU") ||
            tipo.includes("REQUERIDO") ||
            tipo.includes("EXECUTADO") ||
            papel.includes("réu") ||
            papel.includes("reu") ||
            papel.includes("requerido") ||
            papel.includes("passivo")
          );
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);

      const interessados = parties
        .filter((p: any) => {
          const side = (p.side || "").toLowerCase();
          const tipo = (p.person_type || p.tipo || "").toUpperCase();
          return (
            side === "interested" ||
            side === "third_party" ||
            tipo.includes("INTERESSADO") ||
            tipo.includes("TERCEIRO")
          );
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);

      parteAtiva = autores.length > 0 ? autores.join(" e ") : "";
      partePassiva = reus.length > 0 ? reus.join(" e ") : "";

      if (!parteAtiva && !partePassiva && interessados.length > 0) {
        parteAtiva = interessados.join(" e ");
        partePassiva = "(Parte interessada - processo recursal)";
      }

      if (
        !parteAtiva &&
        !partePassiva &&
        responseData.name &&
        responseData.name.includes(" X ")
      ) {
        const partes = responseData.name.split(" X ");
        parteAtiva = partes[0]?.trim() || "";
        partePassiva = partes[1]?.trim() || "";
      }

      const instance = responseData.instance || responseData.instancia;
      if (
        !parteAtiva &&
        !partePassiva &&
        responseData.name &&
        instance &&
        instance >= 2
      ) {
        parteAtiva = responseData.name;
        partePassiva = "(Processo de 2ª instância)";
      }

      if (
        !parteAtiva &&
        !partePassiva &&
        responseData.name &&
        !responseData.name.includes(" X ")
      ) {
        parteAtiva = responseData.name;
      }

      const tribunal = responseData.courts?.[0]?.name || "";
      const tribunalSigla = responseData.courts?.[0]?.acronym || "";

      // Verificar se processo já existe
      const { data: existente } = await supabase
        .from("processos_cnpj")
        .select("id")
        .eq("cnpj_id", cnpjId)
        .eq("numero_cnj", numeroCnj)
        .single();

      const processoData = {
        cnpj_id: cnpjId,
        numero_cnj: numeroCnj,
        parte_ativa: parteAtiva,
        parte_passiva: partePassiva,
        partes_completas: responseData.parties || null,
        tribunal,
        tribunal_sigla: tribunalSigla,
        estado: responseData.county || null,
        instancia: responseData.instance || null,
        status_processual:
          responseData.situation || responseData.status || null,
        fase_processual: responseData.phase || null,
        valor_causa: responseData.amount || null,
        data_distribuicao: responseData.distribution_date
          ? responseData.distribution_date.split("T")[0]
          : null,
        area_direito: responseData.area
          || (Array.isArray(responseData.classifications)
            ? responseData.classifications.map((c: any) => c.name || c).filter(Boolean).join(", ")
            : null),
        assunto: Array.isArray(responseData.subjects)
          ? responseData.subjects.map((s: any) => s.name || s).filter(Boolean).join(", ")
          : null,
        link_tribunal:
          responseData.tribunal_url !== "NAO INFORMADO"
            ? responseData.tribunal_url
            : responseData.url !== "NAO INFORMADO"
            ? responseData.url
            : null,
        ultimo_andamento: responseData.last_step?.content || null,
        ultimo_andamento_data: responseData.last_step?.step_date || null,
        capa_completa: responseData,
        user_id: userId,
        tenant_id: tenantId,
      };

      if (existente) {
        await supabase
          .from("processos_cnpj")
          .update(processoData)
          .eq("id", existente.id);
        processosAtualizados++;
      } else {
        await supabase.from("processos_cnpj").insert(processoData);
        processosNovos++;
      }
    }

    // 5. Atualizar totais no CNPJ
    const { count } = await supabase
      .from("processos_cnpj")
      .select("*", { count: "exact", head: true })
      .eq("cnpj_id", cnpjId);

    await supabase
      .from("cnpjs_cadastrados")
      .update({
        total_processos: count || 0,
        ultima_sincronizacao: new Date().toISOString(),
        ultimo_request_id: requestId,
        request_id_data: new Date().toISOString(),
      })
      .eq("id", cnpjId);

    // 6. Log (custo 0)
    await supabase.from("judit_api_logs").insert({
      tenant_id: tenantId,
      user_id: userId,
      tipo_chamada: "sync-tracking-cnpj",
      endpoint: `/tracking/${trackingId}`,
      metodo: "GET",
      request_id: requestId,
      sucesso: true,
      resposta_status: 200,
      custo_estimado: 0,
    });

    console.log(
      `[Sync CNPJ Tracking] Concluído: ${processosNovos} novos, ${processosAtualizados} atualizados`
    );

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        processosEncontrados: allProcessos.length,
        processosNovos,
        processosAtualizados,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Sync CNPJ Tracking] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
