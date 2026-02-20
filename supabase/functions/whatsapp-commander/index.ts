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

// Tools definition for the AI
const tools = [
  {
    type: "function" as const,
    function: {
      name: "criar_prazo",
      description:
        "Cria um prazo/deadline na agenda do escritório. Use quando o usuário pedir para criar prazo, compromisso, deadline, vencimento, etc.",
      parameters: {
        type: "object",
        properties: {
          titulo: {
            type: "string",
            description: "Título do prazo. Se não informado, gere um baseado no contexto.",
          },
          descricao: {
            type: "string",
            description: "Descrição ou detalhes adicionais sobre o prazo (fase, observações, etc)",
          },
          data_vencimento: {
            type: "string",
            description: "Data de vencimento no formato YYYY-MM-DD",
          },
          responsavel_nome: {
            type: "string",
            description: "Nome do responsável pelo prazo",
          },
          processo_numero: {
            type: "string",
            description: "Número do processo/caso (CNJ ou interno), se informado",
          },
          cliente: {
            type: "string",
            description: "Nome do cliente relacionado, se informado",
          },
        },
        required: ["titulo", "data_vencimento"],
        additionalProperties: false,
      },
    },
  },
];

async function sendWhatsAppReply(
  phone: string,
  message: string,
  instanceCredentials: any
) {
  let baseUrl: string | undefined;
  let clientToken: string | undefined;

  if (instanceCredentials?.zapi_instance_id && instanceCredentials?.zapi_instance_token) {
    baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
    clientToken = instanceCredentials.zapi_client_token || undefined;
  } else {
    baseUrl = Deno.env.get("Z_API_URL");
    clientToken = Deno.env.get("Z_API_TOKEN");
  }

  if (!baseUrl) {
    console.error("No Z-API credentials for commander reply");
    return;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const resp = await fetch(`${baseUrl}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });

  if (!resp.ok) {
    console.error("Commander reply Z-API error:", resp.status);
  }
  await resp.text(); // consume body
}

async function executeCriarPrazo(
  args: any,
  tenantId: string,
  commanderUserId: string | null
): Promise<string> {
  try {
    const { titulo, descricao, data_vencimento, responsavel_nome, processo_numero, cliente } = args;

    // 1. Buscar responsável pelo nome (fuzzy match)
    let advogadoResponsavelId: string | null = null;
    if (responsavel_nome) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("tenant_id", tenantId)
        .ilike("full_name", `%${responsavel_nome}%`);

      if (profiles && profiles.length > 0) {
        advogadoResponsavelId = profiles[0].user_id;
      }
    }

    // 2. Buscar processo pelo número (se informado)
    let processoOabId: string | null = null;
    if (processo_numero) {
      const cleanNum = processo_numero.replace(/\D/g, "");
      const { data: processos } = await supabase
        .from("processos_oab")
        .select("id, numero_cnj")
        .eq("tenant_id", tenantId)
        .or(`numero_cnj.ilike.%${cleanNum}%`);

      if (processos && processos.length > 0) {
        processoOabId = processos[0].id;
      }
    }

    // 3. Determinar user_id para o prazo
    const userId = advogadoResponsavelId || commanderUserId;
    if (!userId) {
      return "❌ Não foi possível determinar o responsável pelo prazo. Informe o nome do responsável.";
    }

    // 4. Inserir deadline
    const { data: deadline, error } = await supabase
      .from("deadlines")
      .insert({
        title: titulo,
        description: descricao || null,
        date: data_vencimento,
        user_id: userId,
        tenant_id: tenantId,
        advogado_responsavel_id: advogadoResponsavelId,
        processo_oab_id: processoOabId,
        completed: false,
      })
      .select("id, title, date")
      .single();

    if (error) {
      console.error("Error creating deadline:", error);
      return `❌ Erro ao criar prazo: ${error.message}`;
    }

    // Build confirmation
    let msg = `✅ *Prazo criado com sucesso!*\n\n`;
    msg += `📋 *Título:* ${titulo}\n`;
    msg += `📅 *Vencimento:* ${formatDate(data_vencimento)}\n`;
    if (responsavel_nome) msg += `👤 *Responsável:* ${responsavel_nome}${advogadoResponsavelId ? "" : " (não encontrado no sistema)"}\n`;
    if (processo_numero) msg += `📁 *Caso:* ${processo_numero}${processoOabId ? "" : " (não encontrado no sistema)"}\n`;
    if (cliente) msg += `🏢 *Cliente:* ${cliente}\n`;
    if (descricao) msg += `📝 *Detalhes:* ${descricao}\n`;

    return msg;
  } catch (e) {
    console.error("Error in criar_prazo:", e);
    return "❌ Erro interno ao criar prazo.";
  }
}

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, tenant_id, instance_credentials, user_id } = await req.json();

    if (!phone || !message || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🤖 Commander processing: "${message.substring(0, 50)}..."`);

    // Call Lovable AI with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é o Commander, um assistente de controle via WhatsApp para escritórios de advocacia. 
Você interpreta comandos em linguagem natural em português e executa ações usando as ferramentas disponíveis.

Regras:
- Sempre use a ferramenta apropriada para executar a ação
- Datas no formato DD/MM/AAAA devem ser convertidas para YYYY-MM-DD nos parâmetros
- Se o usuário não informar um título, gere um baseado no contexto (ex: "Prazo - Cliente X - Caso Y")
- Seja preciso na extração de informações: nomes, datas, números de processo
- Se não conseguir entender o comando, responda pedindo mais informações

Data atual: ${new Date().toISOString().split("T")[0]}`,
          },
          { role: "user", content: message },
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
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    if (!choice) {
      await sendWhatsAppReply(phone, "⚠️ Não consegui processar o comando.", instance_credentials);
      return new Response(JSON.stringify({ success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any;
        try {
          fnArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          fnArgs = {};
        }

        console.log(`🔧 Tool call: ${fnName}`, JSON.stringify(fnArgs));

        let result = "";
        switch (fnName) {
          case "criar_prazo":
            result = await executeCriarPrazo(fnArgs, tenant_id, user_id);
            break;
          default:
            result = `⚠️ Comando "${fnName}" não reconhecido.`;
        }

        await sendWhatsAppReply(phone, result, instance_credentials);
      }
    } else if (choice.message?.content) {
      // AI responded with text (e.g., asking for clarification)
      await sendWhatsAppReply(phone, choice.message.content, instance_credentials);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Commander error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
