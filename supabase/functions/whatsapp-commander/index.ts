import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// ─── Tools definition ───────────────────────────────────────────────────────

const tools = [
  {
    type: "function" as const,
    function: {
      name: "criar_prazo",
      description: "Cria um prazo/deadline na agenda do escritório. Use quando o usuário pedir para criar prazo, compromisso, deadline, vencimento, etc. NÃO use para prazos vinculados a protocolo/etapa de projeto (use criar_protocolo_prazo).",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título do prazo. Se não informado, gere um baseado no contexto." },
          descricao: { type: "string", description: "Descrição ou detalhes adicionais" },
          data_vencimento: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
          responsavel_nome: { type: "string", description: "Nome do responsável pelo prazo" },
          processo_numero: { type: "string", description: "Número do processo/caso (CNJ ou interno)" },
          cliente: { type: "string", description: "Nome do cliente relacionado" },
        },
        required: ["titulo", "data_vencimento"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_projeto",
      description: "Cria um novo projeto/workspace no sistema. Use quando o usuário pedir para criar projeto, workspace, caso novo, etc.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do projeto" },
          cliente_nome: { type: "string", description: "Nome do cliente para vincular ao projeto (busca por nome)" },
          descricao: { type: "string", description: "Descrição do projeto" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_cliente",
      description: "Cadastra um novo cliente (pessoa física ou jurídica). Use quando o usuário pedir para cadastrar cliente, adicionar cliente, registrar cliente.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo da pessoa física OU razão social da PJ" },
          tipo: { type: "string", enum: ["pf", "pj"], description: "pf = pessoa física, pj = pessoa jurídica" },
          cpf: { type: "string", description: "CPF (somente PF)" },
          cnpj: { type: "string", description: "CNPJ (somente PJ)" },
          telefone: { type: "string", description: "Telefone" },
          email: { type: "string", description: "Email" },
        },
        required: ["nome", "tipo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "baixar_parcela",
      description: "Dá baixa (marca como pago) em uma parcela de um cliente. Use quando o usuário pedir para dar baixa, registrar pagamento, marcar pago, etc.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Nome do cliente" },
          numero_parcela: { type: "number", description: "Número da parcela (ex: 1, 2, 3)" },
          metodo_pagamento: { type: "string", description: "Método: PIX, boleto, cartão, dinheiro, transferência" },
          valor_pago: { type: "number", description: "Valor pago (se diferente do valor da parcela)" },
        },
        required: ["cliente_nome", "numero_parcela"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "vincular_processo",
      description: "Vincula um caso/processo judicial a um projeto existente. Use quando o usuário pedir para vincular, associar, ligar processo a projeto.",
      parameters: {
        type: "object",
        properties: {
          projeto_nome: { type: "string", description: "Nome do projeto" },
          processo_numero: { type: "string", description: "Número do processo (CNJ)" },
        },
        required: ["projeto_nome", "processo_numero"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_protocolo_prazo",
      description: "Cria um prazo vinculado a uma etapa de protocolo dentro de um projeto. Use quando o usuário mencionar projeto + protocolo + etapa + prazo. Hierarquia: Projeto > Protocolo > Etapa > Prazo.",
      parameters: {
        type: "object",
        properties: {
          projeto_nome: { type: "string", description: "Nome do projeto" },
          protocolo_nome: { type: "string", description: "Nome do protocolo (ex: Revisional, Execução)" },
          etapa_nome: { type: "string", description: "Nome da etapa (ex: Inicial, Recursal)" },
          titulo_prazo: { type: "string", description: "Título do prazo" },
          data_vencimento: { type: "string", description: "Data no formato YYYY-MM-DD" },
          responsavel_nome: { type: "string", description: "Nome do responsável" },
        },
        required: ["projeto_nome", "protocolo_nome", "etapa_nome", "titulo_prazo", "data_vencimento"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_prazos",
      description: "Lista prazos/deadlines pendentes. Use quando o usuário perguntar sobre prazos, agenda, compromissos, o que tem para hoje, prazos vencidos, etc.",
      parameters: {
        type: "object",
        properties: {
          filtro: { type: "string", enum: ["hoje", "vencidos", "proximos", "todos"], description: "Filtro: hoje=prazos de hoje, vencidos=atrasados, proximos=próximos 7 dias, todos=todos pendentes" },
          responsavel_nome: { type: "string", description: "Filtrar por responsável" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_projetos",
      description: "Lista projetos ativos do escritório. Use quando o usuário perguntar sobre projetos, workspaces, casos ativos.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Filtrar por nome do cliente" },
        },
        additionalProperties: false,
      },
    },
  },
];

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `Você é o Commander, um assistente inteligente de controle de um escritório de advocacia via WhatsApp.
Você interpreta comandos em linguagem natural em português e executa ações usando as ferramentas disponíveis.

ESTRUTURA DO SISTEMA:
- Clientes: pessoas físicas (PF) ou jurídicas (PJ) cadastradas no sistema
- Projetos: workspaces/pastas de trabalho, podem estar vinculados a um cliente
- Protocolos: fluxos de trabalho dentro de um projeto (ex: "Revisional", "Execução Fiscal")
- Etapas: fases dentro de um protocolo (ex: "Inicial", "Recursal", "Cumprimento de Sentença")
- Prazos (Deadlines): compromissos com data de vencimento, podem ser vinculados a projetos, processos ou etapas de protocolo
- Casos/Processos: processos judiciais com número CNJ, podem ser vinculados a projetos
- Parcelas: pagamentos parcelados dos clientes, cada uma com número sequencial, valor e status

HIERARQUIA DE PRAZOS:
- Prazo simples: só título + data (usar criar_prazo)
- Prazo de protocolo: Projeto > Protocolo > Etapa > Prazo (usar criar_protocolo_prazo)
- Se o usuário mencionar projeto, protocolo ou etapa junto com prazo, use criar_protocolo_prazo

REGRAS:
- Se faltar informação obrigatória, PERGUNTE antes de executar a ação
- Sempre confirme a ação executada com todos os detalhes relevantes
- Datas no formato DD/MM/AAAA ou DD/MM/AA devem ser convertidas para YYYY-MM-DD nos parâmetros
- Se o ano tiver 2 dígitos (ex: 26), interprete como 20XX (ex: 2026)
- Se não entender o comando, pergunte educadamente
- Use a ferramenta mais específica para cada caso
- Para nomes de pessoas, projetos, etc., use exatamente como o usuário informou
- Se o usuário não informar um título para o prazo, gere um baseado no contexto

Data atual: ${today}`;
}

// ─── Audio transcription ────────────────────────────────────────────────────

async function transcribeAudio(audioUrl: string): Promise<string | null> {
  try {
    console.log("🎤 Downloading audio for transcription...");
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) return null;

    const audioBlob = await audioResp.blob();
    const formData = new FormData();
    const ext = audioBlob.type.includes("ogg") ? "ogg" : audioBlob.type.includes("mp4") ? "m4a" : "ogg";
    formData.append("file", audioBlob, `audio.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const sttResp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: formData,
    });

    if (!sttResp.ok) return null;
    const sttData = await sttResp.json();
    const text = sttData.text?.trim();
    console.log(`🎤 Transcription: "${text?.substring(0, 80)}..."`);
    return text || null;
  } catch (e) {
    console.error("Transcription error:", e);
    return null;
  }
}

// ─── WhatsApp reply ─────────────────────────────────────────────────────────

async function sendWhatsAppReply(phone: string, message: string, instanceCredentials: any) {
  let baseUrl: string | undefined;
  let clientToken: string | undefined;

  if (instanceCredentials?.zapi_instance_id && instanceCredentials?.zapi_instance_token) {
    baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
    clientToken = instanceCredentials.zapi_client_token || undefined;
  } else {
    baseUrl = Deno.env.get("Z_API_URL");
    clientToken = Deno.env.get("Z_API_TOKEN");
  }

  if (!baseUrl) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const resp = await fetch(`${baseUrl}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });
  await resp.text();
}

async function saveOutgoingMessage(phone: string, message: string, tenantId: string, instanceName: string, userId: string, agentId: string | null) {
  await supabase.from("whatsapp_messages").insert({
    from_number: phone,
    message_text: message,
    direction: "outgoing",
    tenant_id: tenantId,
    instance_name: instanceName,
    message_id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message_type: "text",
    user_id: userId,
    agent_id: agentId,
    timestamp: new Date().toISOString(),
    is_read: true,
  });
}

// ─── Helper: find profile by name ───────────────────────────────────────────

async function findProfileByName(tenantId: string, name: string) {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("tenant_id", tenantId)
    .ilike("full_name", `%${name}%`);
  return data?.[0] || null;
}

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

// ─── Tool executors ─────────────────────────────────────────────────────────

async function executeCriarPrazo(args: any, tenantId: string, commanderUserId: string | null): Promise<string> {
  try {
    const { titulo, descricao, data_vencimento, responsavel_nome, processo_numero, cliente } = args;

    let advogadoId: string | null = null;
    if (responsavel_nome) {
      const profile = await findProfileByName(tenantId, responsavel_nome);
      if (profile) advogadoId = profile.user_id;
    }

    let processoId: string | null = null;
    if (processo_numero) {
      const cleanNum = processo_numero.replace(/\D/g, "");
      const { data } = await supabase.from("processos_oab").select("id").eq("tenant_id", tenantId).or(`numero_cnj.ilike.%${cleanNum}%`);
      if (data?.[0]) processoId = data[0].id;
    }

    const userId = advogadoId || commanderUserId;
    if (!userId) return "❌ Não foi possível determinar o responsável. Informe o nome do responsável.";

    const { error } = await supabase.from("deadlines").insert({
      title: titulo, description: descricao || null, date: data_vencimento,
      user_id: userId, tenant_id: tenantId, advogado_responsavel_id: advogadoId,
      processo_oab_id: processoId, completed: false,
    });

    if (error) return `❌ Erro ao criar prazo: ${error.message}`;

    let msg = `✅ *Prazo criado!*\n\n📋 *Título:* ${titulo}\n📅 *Vencimento:* ${formatDate(data_vencimento)}\n`;
    if (responsavel_nome) msg += `👤 *Responsável:* ${responsavel_nome}${advogadoId ? "" : " (não encontrado no sistema)"}\n`;
    if (processo_numero) msg += `📁 *Caso:* ${processo_numero}${processoId ? "" : " (não encontrado)"}\n`;
    if (cliente) msg += `🏢 *Cliente:* ${cliente}\n`;
    if (descricao) msg += `📝 *Detalhes:* ${descricao}\n`;
    return msg;
  } catch (e) {
    console.error("Error in criar_prazo:", e);
    return "❌ Erro interno ao criar prazo.";
  }
}

async function executeCriarProjeto(args: any, tenantId: string, commanderUserId: string | null): Promise<string> {
  try {
    const { nome, cliente_nome, descricao } = args;
    if (!commanderUserId) return "❌ Não foi possível identificar o usuário para criar o projeto.";

    let clienteId: string | null = null;
    let clienteEncontrado = "";
    if (cliente_nome) {
      const { data } = await supabase.from("clientes").select("id, nome_pessoa_fisica, nome_pessoa_juridica")
        .eq("tenant_id", tenantId)
        .or(`nome_pessoa_fisica.ilike.%${cliente_nome}%,nome_pessoa_juridica.ilike.%${cliente_nome}%`);
      if (data?.[0]) {
        clienteId = data[0].id;
        clienteEncontrado = data[0].nome_pessoa_fisica || data[0].nome_pessoa_juridica || cliente_nome;
      }
    }

    const { error } = await supabase.from("projects").insert({
      name: nome, description: descricao || null,
      created_by: commanderUserId, tenant_id: tenantId,
      client: cliente_nome || null, cliente_id: clienteId,
    });

    if (error) return `❌ Erro ao criar projeto: ${error.message}`;

    let msg = `✅ *Projeto criado!*\n\n📁 *Nome:* ${nome}\n`;
    if (cliente_nome) msg += `🏢 *Cliente:* ${clienteEncontrado || cliente_nome}${clienteId ? "" : " (não encontrado no sistema)"}\n`;
    if (descricao) msg += `📝 *Descrição:* ${descricao}\n`;
    return msg;
  } catch (e) {
    console.error("Error in criar_projeto:", e);
    return "❌ Erro interno ao criar projeto.";
  }
}

async function executeCriarCliente(args: any, tenantId: string, commanderUserId: string | null): Promise<string> {
  try {
    const { nome, tipo, cpf, cnpj, telefone, email } = args;
    if (!commanderUserId) return "❌ Não foi possível identificar o usuário.";

    const insertData: any = {
      user_id: commanderUserId, tenant_id: tenantId,
      classificacao: tipo, status_cliente: "ativo",
    };

    if (tipo === "pf") {
      insertData.nome_pessoa_fisica = nome;
      if (cpf) insertData.cpf = cpf;
    } else {
      insertData.nome_pessoa_juridica = nome;
      if (cnpj) insertData.cnpj = cnpj;
    }
    if (telefone) insertData.telefone = telefone;
    if (email) insertData.email = email;

    const { error } = await supabase.from("clientes").insert(insertData);
    if (error) return `❌ Erro ao cadastrar cliente: ${error.message}`;

    let msg = `✅ *Cliente cadastrado!*\n\n👤 *Nome:* ${nome}\n📋 *Tipo:* ${tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}\n`;
    if (cpf) msg += `🆔 *CPF:* ${cpf}\n`;
    if (cnpj) msg += `🆔 *CNPJ:* ${cnpj}\n`;
    if (telefone) msg += `📱 *Telefone:* ${telefone}\n`;
    if (email) msg += `📧 *Email:* ${email}\n`;
    return msg;
  } catch (e) {
    console.error("Error in criar_cliente:", e);
    return "❌ Erro interno ao cadastrar cliente.";
  }
}

async function executeBaixarParcela(args: any, tenantId: string): Promise<string> {
  try {
    const { cliente_nome, numero_parcela, metodo_pagamento, valor_pago } = args;

    // Find client
    const { data: clientes } = await supabase.from("clientes")
      .select("id, nome_pessoa_fisica, nome_pessoa_juridica")
      .eq("tenant_id", tenantId)
      .or(`nome_pessoa_fisica.ilike.%${cliente_nome}%,nome_pessoa_juridica.ilike.%${cliente_nome}%`);

    if (!clientes?.length) return `❌ Cliente "${cliente_nome}" não encontrado no sistema.`;
    const cliente = clientes[0];
    const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || cliente_nome;

    // Find parcela
    const { data: parcelas } = await supabase.from("cliente_parcelas")
      .select("id, numero_parcela, valor_parcela, status, data_vencimento")
      .eq("cliente_id", cliente.id)
      .eq("numero_parcela", numero_parcela);

    if (!parcelas?.length) return `❌ Parcela ${numero_parcela} não encontrada para ${nomeCliente}.`;
    const parcela = parcelas[0];

    if (parcela.status === "pago") return `⚠️ A parcela ${numero_parcela} de ${nomeCliente} já está marcada como paga.`;

    const valorPago = valor_pago || parcela.valor_parcela;

    const { error } = await supabase.from("cliente_parcelas").update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
      metodo_pagamento: metodo_pagamento || null,
      valor_pago: valorPago,
    }).eq("id", parcela.id);

    if (error) return `❌ Erro ao dar baixa: ${error.message}`;

    let msg = `✅ *Parcela paga!*\n\n👤 *Cliente:* ${nomeCliente}\n`;
    msg += `🔢 *Parcela:* ${numero_parcela}\n`;
    msg += `💰 *Valor:* R$ ${valorPago.toFixed(2)}\n`;
    msg += `📅 *Vencimento:* ${formatDate(parcela.data_vencimento)}\n`;
    if (metodo_pagamento) msg += `💳 *Método:* ${metodo_pagamento}\n`;
    return msg;
  } catch (e) {
    console.error("Error in baixar_parcela:", e);
    return "❌ Erro interno ao dar baixa na parcela.";
  }
}

async function executeVincularProcesso(args: any, tenantId: string): Promise<string> {
  try {
    const { projeto_nome, processo_numero } = args;

    // Find project
    const { data: projetos } = await supabase.from("projects").select("id, name")
      .eq("tenant_id", tenantId).ilike("name", `%${projeto_nome}%`);
    if (!projetos?.length) return `❌ Projeto "${projeto_nome}" não encontrado.`;
    const projeto = projetos[0];

    // Find processo
    const cleanNum = processo_numero.replace(/\D/g, "");
    const { data: processos } = await supabase.from("processos_oab").select("id, numero_cnj")
      .eq("tenant_id", tenantId).or(`numero_cnj.ilike.%${cleanNum}%`);
    if (!processos?.length) return `❌ Processo "${processo_numero}" não encontrado.`;
    const processo = processos[0];

    // Check if already linked
    const { data: existing } = await supabase.from("project_processos")
      .select("id").eq("projeto_id", projeto.id).eq("processo_oab_id", processo.id);
    if (existing?.length) return `⚠️ Processo ${processo.numero_cnj} já está vinculado ao projeto ${projeto.name}.`;

    const { error } = await supabase.from("project_processos").insert({
      projeto_id: projeto.id, processo_oab_id: processo.id, tenant_id: tenantId,
    });
    if (error) return `❌ Erro ao vincular: ${error.message}`;

    return `✅ *Processo vinculado!*\n\n📁 *Projeto:* ${projeto.name}\n⚖️ *Processo:* ${processo.numero_cnj}`;
  } catch (e) {
    console.error("Error in vincular_processo:", e);
    return "❌ Erro interno ao vincular processo.";
  }
}

async function executeCriarProtocoloPrazo(args: any, tenantId: string, commanderUserId: string | null): Promise<string> {
  try {
    const { projeto_nome, protocolo_nome, etapa_nome, titulo_prazo, data_vencimento, responsavel_nome } = args;

    // Find project
    const { data: projetos } = await supabase.from("projects").select("id, name")
      .eq("tenant_id", tenantId).ilike("name", `%${projeto_nome}%`);
    if (!projetos?.length) return `❌ Projeto "${projeto_nome}" não encontrado.`;
    const projeto = projetos[0];

    // Find protocolo
    const { data: protocolos } = await supabase.from("project_protocolos").select("id, nome")
      .eq("project_id", projeto.id).ilike("nome", `%${protocolo_nome}%`);
    if (!protocolos?.length) return `❌ Protocolo "${protocolo_nome}" não encontrado no projeto ${projeto.name}.`;
    const protocolo = protocolos[0];

    // Find etapa
    const { data: etapas } = await supabase.from("project_protocolo_etapas").select("id, nome")
      .eq("protocolo_id", protocolo.id).ilike("nome", `%${etapa_nome}%`);
    if (!etapas?.length) return `❌ Etapa "${etapa_nome}" não encontrada no protocolo ${protocolo.nome}.`;
    const etapa = etapas[0];

    // Find responsável
    let advogadoId: string | null = null;
    if (responsavel_nome) {
      const profile = await findProfileByName(tenantId, responsavel_nome);
      if (profile) advogadoId = profile.user_id;
    }

    const userId = advogadoId || commanderUserId;
    if (!userId) return "❌ Não foi possível determinar o responsável.";

    const { error } = await supabase.from("deadlines").insert({
      title: titulo_prazo, date: data_vencimento,
      user_id: userId, tenant_id: tenantId,
      project_id: projeto.id, protocolo_etapa_id: etapa.id,
      advogado_responsavel_id: advogadoId, completed: false,
    });
    if (error) return `❌ Erro ao criar prazo: ${error.message}`;

    let msg = `✅ *Prazo de protocolo criado!*\n\n`;
    msg += `📁 *Projeto:* ${projeto.name}\n`;
    msg += `📋 *Protocolo:* ${protocolo.nome}\n`;
    msg += `📌 *Etapa:* ${etapa.nome}\n`;
    msg += `📋 *Prazo:* ${titulo_prazo}\n`;
    msg += `📅 *Vencimento:* ${formatDate(data_vencimento)}\n`;
    if (responsavel_nome) msg += `👤 *Responsável:* ${responsavel_nome}${advogadoId ? "" : " (não encontrado)"}\n`;
    return msg;
  } catch (e) {
    console.error("Error in criar_protocolo_prazo:", e);
    return "❌ Erro interno ao criar prazo de protocolo.";
  }
}

async function executeListarPrazos(args: any, tenantId: string): Promise<string> {
  try {
    const { filtro, responsavel_nome } = args || {};
    const today = new Date().toISOString().split("T")[0];

    let query = supabase.from("deadlines")
      .select("title, date, completed, advogado_responsavel_id, profiles!deadlines_advogado_responsavel_id_fkey(full_name)")
      .eq("tenant_id", tenantId)
      .eq("completed", false)
      .order("date", { ascending: true })
      .limit(15);

    if (filtro === "hoje") {
      query = query.eq("date", today);
    } else if (filtro === "vencidos") {
      query = query.lt("date", today);
    } else if (filtro === "proximos") {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
      query = query.gte("date", today).lte("date", nextWeek);
    }

    if (responsavel_nome) {
      const profile = await findProfileByName(tenantId, responsavel_nome);
      if (profile) query = query.eq("advogado_responsavel_id", profile.user_id);
    }

    const { data, error } = await query;
    if (error) return `❌ Erro ao listar prazos: ${error.message}`;
    if (!data?.length) return "📭 Nenhum prazo encontrado com esses critérios.";

    const label = filtro === "hoje" ? "de hoje" : filtro === "vencidos" ? "vencidos" : filtro === "proximos" ? "dos próximos 7 dias" : "pendentes";
    let msg = `📋 *Prazos ${label}:*\n\n`;
    for (const d of data) {
      const resp = (d as any).profiles?.full_name || "—";
      const vencido = d.date < today ? "🔴" : d.date === today ? "🟡" : "🟢";
      msg += `${vencido} *${d.title}*\n   📅 ${formatDate(d.date)} | 👤 ${resp}\n\n`;
    }
    return msg;
  } catch (e) {
    console.error("Error in listar_prazos:", e);
    return "❌ Erro interno ao listar prazos.";
  }
}

async function executeListarProjetos(args: any, tenantId: string): Promise<string> {
  try {
    const { cliente_nome } = args || {};

    let query = supabase.from("projects").select("name, client, description, created_at")
      .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(15);

    if (cliente_nome) {
      query = query.ilike("client", `%${cliente_nome}%`);
    }

    const { data, error } = await query;
    if (error) return `❌ Erro ao listar projetos: ${error.message}`;
    if (!data?.length) return "📭 Nenhum projeto encontrado.";

    let msg = `📁 *Projetos ativos:*\n\n`;
    for (const p of data) {
      msg += `📂 *${p.name}*\n`;
      if (p.client) msg += `   🏢 ${p.client}\n`;
      if (p.description) msg += `   📝 ${p.description}\n`;
      msg += `\n`;
    }
    return msg;
  } catch (e) {
    console.error("Error in listar_projetos:", e);
    return "❌ Erro interno ao listar projetos.";
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, audio_url, tenant_id, instance_credentials, user_id, agent_id, instance_name } = await req.json();

    if (!phone || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve input text
    let inputText = message || "";
    if (audio_url && !inputText) {
      inputText = await transcribeAudio(audio_url) || "";
    }

    if (!inputText) {
      const noTextMsg = "⚠️ Não consegui entender o áudio. Tente enviar uma mensagem de texto.";
      await sendWhatsAppReply(phone, noTextMsg, instance_credentials);
      await saveOutgoingMessage(phone, noTextMsg, tenant_id, instance_name || "", user_id || "", agent_id || null);
      return new Response(JSON.stringify({ success: false, error: "No input text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🤖 Commander processing: "${inputText.substring(0, 100)}..."`);

    // Call AI with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: inputText },
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      const errorMsg = aiResponse.status === 429
        ? "⚠️ Limite de requisições atingido. Tente novamente em alguns segundos."
        : aiResponse.status === 402
        ? "⚠️ Créditos de IA esgotados. Contate o administrador."
        : "⚠️ Erro ao processar comando. Tente novamente.";
      await sendWhatsAppReply(phone, errorMsg, instance_credentials);
      await saveOutgoingMessage(phone, errorMsg, tenant_id, instance_name || "", user_id || "", agent_id || null);
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    if (!choice) {
      const noChoiceMsg = "⚠️ Não consegui processar o comando.";
      await sendWhatsAppReply(phone, noChoiceMsg, instance_credentials);
      await saveOutgoingMessage(phone, noChoiceMsg, tenant_id, instance_name || "", user_id || "", agent_id || null);
      return new Response(JSON.stringify({ success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool calls
    if (choice.message?.tool_calls?.length) {
      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any;
        try { fnArgs = JSON.parse(toolCall.function.arguments); } catch { fnArgs = {}; }

        console.log(`🔧 Tool call: ${fnName}`, JSON.stringify(fnArgs));

        let result = "";
        switch (fnName) {
          case "criar_prazo":
            result = await executeCriarPrazo(fnArgs, tenant_id, user_id);
            break;
          case "criar_projeto":
            result = await executeCriarProjeto(fnArgs, tenant_id, user_id);
            break;
          case "criar_cliente":
            result = await executeCriarCliente(fnArgs, tenant_id, user_id);
            break;
          case "baixar_parcela":
            result = await executeBaixarParcela(fnArgs, tenant_id);
            break;
          case "vincular_processo":
            result = await executeVincularProcesso(fnArgs, tenant_id);
            break;
          case "criar_protocolo_prazo":
            result = await executeCriarProtocoloPrazo(fnArgs, tenant_id, user_id);
            break;
          case "listar_prazos":
            result = await executeListarPrazos(fnArgs, tenant_id);
            break;
          case "listar_projetos":
            result = await executeListarProjetos(fnArgs, tenant_id);
            break;
          default:
            result = `⚠️ Comando "${fnName}" não reconhecido.`;
        }

        await sendWhatsAppReply(phone, result, instance_credentials);
        await saveOutgoingMessage(phone, result, tenant_id, instance_name || "", user_id || "", agent_id || null);
      }
    } else if (choice.message?.content) {
      await sendWhatsAppReply(phone, choice.message.content, instance_credentials);
      await saveOutgoingMessage(phone, choice.message.content, tenant_id, instance_name || "", user_id || "", agent_id || null);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Commander error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
