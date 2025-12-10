import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se e super admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: superAdmin } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admins can delete tenants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenant_id } = await req.json();
    
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting cascading delete for tenant: ${tenant_id}`);

    const deletionResults: Record<string, number> = {};

    // Ordem de delecao respeitando dependencias (de dependentes para principais)
    const tablesToDelete = [
      // Nivel 1: Tabelas mais dependentes (sub-dependencias)
      "task_files",
      "task_comments",
      "cliente_pagamento_comentarios",
      "processos_oab_anexos",
      "processos_oab_tarefas",
      "processos_oab_andamentos",
      "deadline_tags",
      "deadline_comentarios",
      "reuniao_arquivos",
      "reuniao_comentarios",
      "reuniao_cliente_arquivos",
      "reuniao_cliente_comentarios",
      "lead_comments",
      "message_attachments",
      "processo_movimentacao_conferencia",
      "processo_andamentos_judit",
      "processo_atualizacoes_escavador",
      "oab_request_historico",
      
      // Nivel 2: Tabelas dependentes de tabelas principais
      "project_columns",
      "project_sectors",
      "project_collaborators",
      "cliente_parcelas",
      "cliente_documentos",
      "cliente_dividas",
      "processo_documentos",
      "processo_etiquetas",
      "processo_historico",
      "processo_movimentacoes",
      "processo_monitoramento_escavador",
      "processo_monitoramento_judit",
      "reuniao_clientes",
      "client_history",
      
      // Nivel 3: Tabelas principais de dados
      "tasks",
      "deadlines",
      "projects",
      "clientes",
      "processos_oab",
      "processos",
      "reunioes",
      "leads_captacao",
      "messages",
      "notifications",
      "oabs_cadastradas",
      "busca_processos_oab",
      "judit_api_logs",
      "controladoria_processos",
      
      // Nivel 4: Tabelas de configuracao
      "etiquetas",
      "grupos_acoes",
      "tipos_acao",
      "tribunais",
      "comarcas",
      "reuniao_status",
      "sector_templates",
      "zapi_config",
      "projudi_credentials",
      
      // Nivel 5: Usuarios do tenant
      "user_roles",
      "profiles",
    ];

    // Executar delecoes em ordem
    for (const table of tablesToDelete) {
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq("tenant_id", tenant_id)
          .select("id");

        if (error) {
          console.log(`Table ${table}: ${error.message}`);
          deletionResults[table] = 0;
        } else {
          const count = data?.length || 0;
          deletionResults[table] = count;
          if (count > 0) {
            console.log(`Deleted ${count} records from ${table}`);
          }
        }
      } catch (e) {
        console.log(`Table ${table} does not exist or error: ${e}`);
        deletionResults[table] = 0;
      }
    }

    // Finalmente deletar o tenant
    const { error: tenantError } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenant_id);

    if (tenantError) {
      console.error("Error deleting tenant:", tenantError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete tenant record", 
          details: tenantError.message,
          deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Tenant ${tenant_id} deleted successfully`);

    // Calcular total de registros deletados
    const totalDeleted = Object.values(deletionResults).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Tenant deleted successfully",
        totalDeleted,
        deletionResults 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-tenant:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
