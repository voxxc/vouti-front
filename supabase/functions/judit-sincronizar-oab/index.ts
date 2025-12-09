import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { oabId, oabNumero, oabUf, tenantId, userId } = await req.json();

    if (!oabId || !oabNumero || !oabUf) {
      throw new Error("oabId, oabNumero e oabUf sao obrigatorios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const juditApiKey = Deno.env.get("JUDIT_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Formatar search_key: numero + UF (ex: "92124PR")
    const searchKey = `${oabNumero}${oabUf}`;

    console.log("[Judit Sync OAB] Buscando processos para OAB:", searchKey);

    // Chamar /request-document para buscar capas de todos os processos
    const requestPayload = {
      search: {
        search_type: "oab",
        search_key: searchKey,
        on_demand: false,
      },
    };

    console.log("[Judit Sync OAB] Payload:", JSON.stringify(requestPayload));

    // Registrar log antes da chamada
    const { data: logData } = await supabase
      .from("judit_api_logs")
      .insert({
        tenant_id: tenantId || null,
        user_id: userId || null,
        oab_id: oabId,
        tipo_chamada: "request-document",
        endpoint: "https://requests.prod.judit.io/requests",
        metodo: "POST",
        request_payload: requestPayload,
        sucesso: false,
      })
      .select("id")
      .single();

    const logId = logData?.id;

    const response = await fetch("https://requests.prod.judit.io/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": juditApiKey.trim(),
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Judit Sync OAB] Erro na requisicao:", response.status, errorText);
      
      // Atualizar log com erro
      if (logId) {
        await supabase
          .from("judit_api_logs")
          .update({ 
            sucesso: false, 
            resposta_status: response.status, 
            erro_mensagem: errorText 
          })
          .eq("id", logId);
      }
      
      throw new Error(`Erro na API Judit: ${response.status}`);
    }

    const initialData = await response.json();
    const requestId = initialData.request_id;

    // Atualizar log com sucesso
    if (logId) {
      await supabase
        .from("judit_api_logs")
        .update({ 
          sucesso: true, 
          resposta_status: 200, 
          request_id: requestId 
        })
        .eq("id", logId);
    }

    console.log("[Judit Sync OAB] Request ID:", requestId);

    // Polling para aguardar resultado COM PAGINACAO COMPLETA
    let attempts = 0;
    const maxAttempts = 30;
    const maxPages = 50; // Limite de paginas
    let allPageData: any[] = [];
    let dataReady = false;

    // Primeira etapa: aguardar dados ficarem disponiveis
    while (attempts < maxAttempts && !dataReady) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
        {
          method: "GET",
          headers: {
            "api-key": juditApiKey.trim(),
            "Content-Type": "application/json",
          },
        }
      );

      if (!statusResponse.ok) {
        console.log("[Judit Sync OAB] Polling erro:", statusResponse.status);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log("[Judit Sync OAB] Polling resposta - count:", statusData.count, "page_data:", statusData.page_data?.length || 0, "total_pages:", statusData.total_pages || 1);

      // CORRIGIDO: Usar page_data em vez de results
      if (statusData.page_data && statusData.page_data.length > 0) {
        dataReady = true;
        allPageData = statusData.page_data;
        
        const totalPages = Math.min(statusData.total_pages || 1, maxPages);
        console.log(`[Judit Sync OAB] Pagina 1/${totalPages} - ${statusData.page_data.length} resultados`);

        // Buscar paginas adicionais se existirem
        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Delay entre paginas
          
          const pageResponse = await fetch(
            `https://requests.prod.judit.io/responses?request_id=${requestId}&page=${currentPage}&page_size=100`,
            {
              method: "GET",
              headers: {
                "api-key": juditApiKey.trim(),
                "Content-Type": "application/json",
              },
            }
          );

          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            if (pageData.page_data && pageData.page_data.length > 0) {
              allPageData = allPageData.concat(pageData.page_data);
              console.log(`[Judit Sync OAB] Pagina ${currentPage}/${totalPages} - ${pageData.page_data.length} resultados`);
            }
          } else {
            console.log(`[Judit Sync OAB] Erro ao buscar pagina ${currentPage}:`, pageResponse.status);
          }
        }
        
        console.log(`[Judit Sync OAB] Total de itens coletados: ${allPageData.length}`);
        break;
      }

      if (statusData.count === 0) {
        console.log("[Judit Sync OAB] Aguardando processamento... tentativa", attempts + 1);
      }

      attempts++;
    }

    if (allPageData.length === 0) {
      throw new Error("Timeout aguardando resposta da API Judit");
    }

    // Extrair processos do page_data
    let processos: any[] = [];

    for (const item of allPageData) {
      const responseData = item.response_data || item;
      
      // Extrair numero CNJ diretamente do response_data
      const numeroCnj = responseData.code || responseData.lawsuit_cnj || responseData.numero_cnj;
      
      if (numeroCnj) {
        // Extrair partes do campo name (formato "AUTOR X REU")
        let parteAtiva = null;
        let partePassiva = null;
        
        if (responseData.name && responseData.name.includes(' X ')) {
          const partes = responseData.name.split(' X ');
          parteAtiva = partes[0]?.trim() || null;
          partePassiva = partes[1]?.trim() || null;
        } else if (responseData.parties && Array.isArray(responseData.parties)) {
          // Fallback: extrair de parties array
          const autores = responseData.parties
            .filter((p: any) => {
              const tipo = (p.person_type || p.tipo || "").toUpperCase();
              return tipo.includes("ATIVO") || tipo.includes("AUTOR") || tipo.includes("REQUERENTE");
            })
            .map((p: any) => p.name || p.nome);
          
          const reus = responseData.parties
            .filter((p: any) => {
              const tipo = (p.person_type || p.tipo || "").toUpperCase();
              return tipo.includes("PASSIVO") || tipo.includes("REU") || tipo.includes("REQUERIDO");
            })
            .map((p: any) => p.name || p.nome);
          
          parteAtiva = autores.length > 0 ? autores.join(" e ") : null;
          partePassiva = reus.length > 0 ? reus.join(" e ") : null;
        }
        
        // Extrair tribunal
        const tribunalInfo = responseData.courts?.[0] || {};
        
        processos.push({
          numero_cnj: numeroCnj,
          tribunal: tribunalInfo.name || responseData.tribunal || null,
          tribunal_sigla: tribunalInfo.acronym || responseData.tribunal_acronym || null,
          parte_ativa: parteAtiva,
          parte_passiva: partePassiva,
          partes_completas: responseData.parties || null,
          status_processual: responseData.situation || responseData.status || null,
          fase_processual: responseData.phase || null,
          data_distribuicao: responseData.distribution_date || null,
          valor_causa: responseData.amount || null,
          juizo: responseData.county || tribunalInfo.name || null,
          link_tribunal: (responseData.tribunal_url && responseData.tribunal_url !== "NAO INFORMADO") 
            ? responseData.tribunal_url 
            : (responseData.url || null),
          capa_completa: responseData,
        });
      }
    }

    console.log("[Judit Sync OAB] Processos encontrados:", processos.length);

    let processosInseridos = 0;
    let processosAtualizados = 0;

    for (const processo of processos) {
        const numeroCnj = processo.numero_cnj;

        if (!numeroCnj) continue;

        const processoData = {
          oab_id: oabId,
          numero_cnj: numeroCnj,
          tribunal: processo.tribunal,
          tribunal_sigla: processo.tribunal_sigla,
          parte_ativa: processo.parte_ativa,
          parte_passiva: processo.parte_passiva,
          partes_completas: processo.partes_completas,
          status_processual: processo.status_processual,
          fase_processual: processo.fase_processual,
          data_distribuicao: processo.data_distribuicao,
          valor_causa: processo.valor_causa,
          juizo: processo.juizo,
          link_tribunal: processo.link_tribunal,
          capa_completa: processo.capa_completa,
        };

        // Upsert do processo
        const { data: existingProcesso } = await supabase
          .from("processos_oab")
          .select("id")
          .eq("oab_id", oabId)
          .eq("numero_cnj", numeroCnj)
          .single();

        if (existingProcesso) {
          await supabase
            .from("processos_oab")
            .update({
              ...processoData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingProcesso.id);
          processosAtualizados++;
        } else {
          const { error: insertError } = await supabase.from("processos_oab").insert({
            ...processoData,
            ordem_lista: processosInseridos,
          });

          if (!insertError) {
            processosInseridos++;
          } else {
            console.error("[Judit Sync OAB] Erro ao inserir processo:", insertError);
          }
      }
    }

    // Atualizar OAB com data de sincronizacao e total
    const totalProcessos = processosInseridos + processosAtualizados;
    await supabase
      .from("oabs_cadastradas")
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_processos: totalProcessos,
        updated_at: new Date().toISOString(),
        ultimo_request_id: requestId,
        request_id_data: new Date().toISOString(),
      })
      .eq("id", oabId);

    console.log("[Judit Sync OAB] Sincronizacao concluida:", { processosInseridos, processosAtualizados, totalColetado: allPageData.length });

    return new Response(
      JSON.stringify({
        success: true,
        processosInseridos,
        processosAtualizados,
        totalProcessos,
        paginasProcessadas: Math.ceil(allPageData.length / 100) || 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Judit Sync OAB] Erro:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
