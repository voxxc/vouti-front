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
    const { cnpjId, cnpj, onDemand = true } = await req.json();

    if (!cnpjId || !cnpj) {
      throw new Error("cnpjId e cnpj sao obrigatorios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const juditApiKey = Deno.env.get("JUDIT_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do CNPJ e tenant
    const { data: cnpjData, error: cnpjError } = await supabase
      .from("cnpjs_cadastrados")
      .select("*")
      .eq("id", cnpjId)
      .single();

    if (cnpjError || !cnpjData) {
      throw new Error("CNPJ nao encontrado");
    }

    const tenantId = cnpjData.tenant_id;
    const userId = cnpjData.user_id;

    // Limpar CNPJ (apenas numeros)
    const cnpjLimpo = cnpj.replace(/\D/g, "");

    console.log(`Iniciando busca para CNPJ: ${cnpjLimpo}, on_demand: ${onDemand}`);

    // Registrar log da chamada
    const { data: logData } = await supabase
      .from("judit_api_logs")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        tipo_chamada: "request-document-cnpj",
        endpoint: "/requests",
        metodo: "POST",
        request_payload: { cnpj: cnpjLimpo, on_demand: onDemand },
        custo_estimado: onDemand ? 0.50 : 0.10,
      })
      .select()
      .single();

    // Fazer POST para Judit API com search_type: "cnpj"
    const juditResponse = await fetch("https://requests.prod.judit.io/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": juditApiKey.trim(),
      },
      body: JSON.stringify({
        search: {
          search_type: "cnpj",
          search_key: cnpjLimpo,
          on_demand: onDemand,
        },
      }),
    });

    if (!juditResponse.ok) {
      const errorText = await juditResponse.text();
      console.error("Erro Judit API:", juditResponse.status, errorText);

      if (logData?.id) {
        await supabase
          .from("judit_api_logs")
          .update({
            resposta_status: juditResponse.status,
            erro_mensagem: errorText,
            sucesso: false,
          })
          .eq("id", logData.id);
      }

      throw new Error(`Erro na API Judit: ${juditResponse.status}`);
    }

    const juditData = await juditResponse.json();
    const requestId = juditData.id;

    console.log(`Request ID recebido: ${requestId}`);

    // Atualizar log
    if (logData?.id) {
      await supabase
        .from("judit_api_logs")
        .update({
          resposta_status: 200,
          request_id: requestId,
          sucesso: true,
        })
        .eq("id", logData.id);
    }

    // Salvar request_id no CNPJ
    await supabase
      .from("cnpjs_cadastrados")
      .update({
        ultimo_request_id: requestId,
        request_id_data: new Date().toISOString(),
      })
      .eq("id", cnpjId);

    // Polling para aguardar resultado (max 60 tentativas, 3s cada)
    let allProcessos: any[] = [];
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempts++;

      console.log(`Polling tentativa ${attempts}/${maxAttempts}`);

      // Buscar todas as paginas
      let currentPage = 1;
      let totalPages = 1;
      let pageProcessos: any[] = [];

      while (currentPage <= totalPages && currentPage <= 50) {
        const statusResponse = await fetch(
          `https://requests.prod.judit.io/responses?request_id=${requestId}&page=${currentPage}&page_size=100`,
          {
            method: "GET",
            headers: {
              "api-key": juditApiKey.trim(),
            },
          }
        );

        if (!statusResponse.ok) {
          console.log(`Pagina ${currentPage} nao pronta ainda`);
          break;
        }

        const statusData = await statusResponse.json();

        if (currentPage === 1) {
          totalPages = statusData.total_pages || 1;
          console.log(`Total de paginas: ${totalPages}`);
        }

        if (statusData.page_data && statusData.page_data.length > 0) {
          pageProcessos = pageProcessos.concat(statusData.page_data);
          currentPage++;
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          break;
        }
      }

      if (pageProcessos.length > 0) {
        allProcessos = pageProcessos;
        console.log(`Encontrados ${allProcessos.length} processos`);
        break;
      }
    }

    if (allProcessos.length === 0) {
      console.log("Nenhum processo encontrado apos polling");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Busca iniciada, aguarde processamento",
          requestId,
          processosEncontrados: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Processar e salvar cada processo
    let processosNovos = 0;
    let processosAtualizados = 0;

    for (const item of allProcessos) {
      const responseData = item.response_data;
      if (!responseData) continue;

      const numeroCnj = responseData.code;
      if (!numeroCnj) continue;

      // Extrair partes com lógica melhorada (suporte a 'side', 2ª instância, fallbacks)
      let parteAtiva = "";
      let partePassiva = "";
      const parties = responseData.parties || [];
      
      // Identificar autores/parte ativa
      const autores = parties
        .filter((p: any) => {
          const tipo = (p.person_type || p.tipo || '').toUpperCase();
          const side = (p.side || '').toLowerCase();
          const papel = (p.role || p.papel || '').toLowerCase();
          return side === 'active' || side === 'plaintiff' || side === 'author' ||
                 tipo.includes('ATIVO') || tipo.includes('AUTOR') || tipo.includes('REQUERENTE') || tipo.includes('EXEQUENTE') ||
                 papel.includes('autor') || papel.includes('requerente') || papel.includes('ativo');
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);
      
      // Identificar réus/parte passiva
      const reus = parties
        .filter((p: any) => {
          const tipo = (p.person_type || p.tipo || '').toUpperCase();
          const side = (p.side || '').toLowerCase();
          const papel = (p.role || p.papel || '').toLowerCase();
          return side === 'passive' || side === 'defendant' ||
                 tipo.includes('PASSIVO') || tipo.includes('REU') || tipo.includes('RÉU') || tipo.includes('REQUERIDO') || tipo.includes('EXECUTADO') ||
                 papel.includes('réu') || papel.includes('reu') || papel.includes('requerido') || papel.includes('passivo');
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);
      
      // Identificar interessados (comum em 2ª instância)
      const interessados = parties
        .filter((p: any) => {
          const side = (p.side || '').toLowerCase();
          const tipo = (p.person_type || p.tipo || '').toUpperCase();
          return side === 'interested' || side === 'third_party' || 
                 tipo.includes('INTERESSADO') || tipo.includes('TERCEIRO');
        })
        .map((p: any) => p.name || p.nome)
        .filter(Boolean);
      
      parteAtiva = autores.length > 0 ? autores.join(' e ') : '';
      partePassiva = reus.length > 0 ? reus.join(' e ') : '';
      
      // Fallback 1: Se não encontrou autor/réu mas tem interessado
      if (!parteAtiva && !partePassiva && interessados.length > 0) {
        parteAtiva = interessados.join(' e ');
        partePassiva = '(Parte interessada - processo recursal)';
      }
      
      // Fallback 2: Campo "name" com padrão " X "
      if (!parteAtiva && !partePassiva && responseData.name && responseData.name.includes(' X ')) {
        const partes = responseData.name.split(' X ');
        parteAtiva = partes[0]?.trim() || '';
        partePassiva = partes[1]?.trim() || '';
      }
      
      // Fallback 3: Campo "name" direto para processos de 2ª instância
      const instance = responseData.instance || responseData.instancia;
      if (!parteAtiva && !partePassiva && responseData.name && instance && instance >= 2) {
        parteAtiva = responseData.name;
        partePassiva = '(Processo de 2ª instância)';
      }
      
      // Fallback 4: Se ainda não tem partes mas tem "name"
      if (!parteAtiva && !partePassiva && responseData.name && !responseData.name.includes(' X ')) {
        parteAtiva = responseData.name;
      }

      // Extrair tribunal
      const tribunal = responseData.courts?.[0]?.name || "";
      const tribunalSigla = responseData.courts?.[0]?.acronym || "";

      // Verificar se processo ja existe
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
        status_processual: responseData.situation || responseData.status || null,
        fase_processual: responseData.phase || null,
        valor_causa: responseData.amount || null,
        data_distribuicao: responseData.distribution_date
          ? responseData.distribution_date.split("T")[0]
          : null,
        area_direito: Array.isArray(responseData.classifications)
          ? responseData.classifications.join(", ")
          : null,
        assunto: Array.isArray(responseData.subjects)
          ? responseData.subjects.join(", ")
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

    // Atualizar total de processos no CNPJ
    const { count } = await supabase
      .from("processos_cnpj")
      .select("*", { count: "exact", head: true })
      .eq("cnpj_id", cnpjId);

    await supabase
      .from("cnpjs_cadastrados")
      .update({
        total_processos: count || 0,
        ultima_sincronizacao: new Date().toISOString(),
      })
      .eq("id", cnpjId);

    console.log(`Sincronizacao concluida: ${processosNovos} novos, ${processosAtualizados} atualizados`);

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        processosEncontrados: allProcessos.length,
        processosNovos,
        processosAtualizados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
