import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para limpar arquivos de um bucket por tenant
async function cleanStorageBucket(
  supabase: SupabaseClient,
  bucketName: string,
  tenantId: string
): Promise<number> {
  try {
    // Listar todos arquivos com prefixo do tenant
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(tenantId);

    if (error) {
      console.log(`Bucket ${bucketName}: ${error.message}`);
      return 0;
    }

    if (!files || files.length === 0) {
      return 0;
    }

    const filePaths = files.map((f) => `${tenantId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths);

    if (deleteError) {
      console.log(`Error deleting files from ${bucketName}: ${deleteError.message}`);
      return 0;
    }

    console.log(`Deleted ${files.length} files from bucket ${bucketName}`);
    return files.length;
  } catch (e) {
    console.log(`Exception cleaning bucket ${bucketName}: ${e}`);
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    console.log(`Starting complete cascading delete for tenant: ${tenant_id}`);

    // FASE 0: Buscar todos os IDs necessários ANTES de deletar
    
    // 0.1: Buscar user_ids do tenant
    const { data: tenantProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("tenant_id", tenant_id);

    if (profilesError) {
      console.error("Error fetching tenant profiles:", profilesError);
    }

    const userIdsToDelete = tenantProfiles?.map(p => p.user_id) || [];
    console.log(`Found ${userIdsToDelete.length} users to delete from auth.users`);

    // 0.2: Buscar project_ids do tenant (para deletar tabelas que referenciam project_id)
    const { data: tenantProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("tenant_id", tenant_id);

    if (projectsError) {
      console.error("Error fetching tenant projects:", projectsError);
    }

    const projectIdsToDelete = tenantProjects?.map(p => p.id) || [];
    console.log(`Found ${projectIdsToDelete.length} projects to delete`);

    // FASE 1: Limpar arquivos do Storage ANTES de deletar registros do banco
    console.log("Starting Storage cleanup...");
    const bucketsToClean = [
      "cliente-documentos",
      "processo-documentos",
      "reuniao-attachments",
      "reuniao-cliente-attachments",
      "task-attachments",
      "comprovantes-pagamento",
      "financial-documents",
      "tribunal-certificates",
      "advogado-logos",
      "lead-attachments",
      "message-attachments",
      "op-fichas-tecnicas",
    ];

    const storageResults: Record<string, number> = {};
    for (const bucket of bucketsToClean) {
      storageResults[bucket] = await cleanStorageBucket(supabase, bucket, tenant_id);
    }

    const totalStorageFilesDeleted = Object.values(storageResults).reduce((a, b) => a + b, 0);
    console.log(`Total storage files deleted: ${totalStorageFilesDeleted}`);

    // Inicializar objeto de resultados
    const deletionResults: Record<string, number> = {};

    // FASE 2: Deletar tabelas que referenciam project_id (não tenant_id)
    const projectDependentTables = [
      "task_history",
      "task_files", 
      "task_comments",
      "task_tarefas",
      "project_columns",
      "project_sectors",
      "project_collaborators",
      "project_processos",
      "project_protocolo_etapas",
      "project_etapa_comments",
      "project_advogados",
      "client_history",
    ];

    for (const table of projectDependentTables) {
      if (projectIdsToDelete.length === 0) continue;
      
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .in("project_id", projectIdsToDelete)
          .select("id");

        if (error) {
          console.log(`Table ${table} (by project_id): ${error.message}`);
          deletionResults[table] = 0;
        } else {
          const count = data?.length || 0;
          deletionResults[table] = count;
          if (count > 0) {
            console.log(`Deleted ${count} records from ${table} (by project_id)`);
          }
        }
      } catch (e) {
        console.log(`Table ${table} does not exist or error: ${e}`);
        deletionResults[table] = 0;
      }
    }

    // FASE 2.5: Deletar tasks (que referenciam project_id)
    if (projectIdsToDelete.length > 0) {
      try {
        const { data, error } = await supabase
          .from("tasks")
          .delete()
          .in("project_id", projectIdsToDelete)
          .select("id");

        if (error) {
          console.log(`Table tasks (by project_id): ${error.message}`);
          deletionResults["tasks"] = 0;
        } else {
          const count = data?.length || 0;
          deletionResults["tasks"] = count;
          if (count > 0) {
            console.log(`Deleted ${count} records from tasks (by project_id)`);
          }
        }
      } catch (e) {
        console.log(`Table tasks error: ${e}`);
        deletionResults["tasks"] = 0;
      }
    }

    // FASE 2.6: Agora deletar projects
    if (projectIdsToDelete.length > 0) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .delete()
          .eq("tenant_id", tenant_id)
          .select("id");

        if (error) {
          console.log(`Table projects: ${error.message}`);
          deletionResults["projects"] = 0;
        } else {
          const count = data?.length || 0;
          deletionResults["projects"] = count;
          if (count > 0) {
            console.log(`Deleted ${count} records from projects`);
          }
        }
      } catch (e) {
        console.log(`Table projects error: ${e}`);
        deletionResults["projects"] = 0;
      }
    }

    // FASE 3: Deletar demais registros do banco por tenant_id
    // Ordem de delecao respeitando dependencias
    // NOTA: Tabelas já deletadas nas fases anteriores são ignoradas aqui
    const tablesToDelete = [
      // ===== NIVEL 0: Sub-dependências =====
      "cliente_pagamento_comentarios",
      "processos_oab_anexos",
      "processos_oab_tarefas",
      "processos_oab_andamentos",
      "processos_cnpj_andamentos",
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
      
      // ===== NIVEL 0.5: Colaboradores =====
      "colaborador_comentarios",
      "colaborador_documentos",
      "colaborador_pagamentos",
      "colaborador_reajustes",
      "colaborador_vales",
      
      // ===== NIVEL 0.5: Custos (dependências) =====
      "custo_comprovantes",
      "custo_parcelas",
      
      // ===== NIVEL 0.5: WhatsApp (dependências) =====
      "whatsapp_messages",
      "whatsapp_automations",
      
      // ===== NIVEL 0.5: Support =====
      "support_ticket_messages",
      
      // ===== NIVEL 1: Tabelas dependentes =====
      "colaboradores",
      "custos",
      "custo_categorias",
      "whatsapp_instances",
      "support_tickets",
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
      
      // ===== NIVEL 2: Tabelas principais =====
      "deadlines",
      "clientes",
      "processos_oab",
      "processos_cnpj",
      "cnpjs_cadastrados",
      "processos",
      "reunioes",
      "leads_captacao",
      "messages",
      "notifications",
      "oabs_cadastradas",
      "busca_processos_oab",
      "judit_api_logs",
      "controladoria_processos",
      
      // ===== NIVEL 3: Configurações =====
      "etiquetas",
      "grupos_acoes",
      "tipos_acao",
      "tribunais",
      "comarcas",
      "reuniao_status",
      "sector_templates",
      "projudi_credentials",
      "tribunal_credentials",
      "tenant_ai_settings",
      "tenant_banco_ids",
      
      // ===== NIVEL 4: Usuarios do tenant =====
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

    // FASE FINAL: Deletar usuarios do auth.users
    let usersDeleted = 0;
    const userDeletionErrors: string[] = [];

    for (const userId of userIdsToDelete) {
      try {
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
        if (deleteUserError) {
          console.error(`Error deleting user ${userId}:`, deleteUserError);
          userDeletionErrors.push(`${userId}: ${deleteUserError.message}`);
        } else {
          usersDeleted++;
          console.log(`Deleted auth user: ${userId}`);
        }
      } catch (e) {
        console.error(`Exception deleting user ${userId}:`, e);
        userDeletionErrors.push(`${userId}: ${e.message}`);
      }
    }

    console.log(`Deleted ${usersDeleted}/${userIdsToDelete.length} auth users`);

    // Calcular total de registros deletados
    const totalDeleted = Object.values(deletionResults).reduce((a, b) => a + b, 0);

    console.log(`=== DELETION COMPLETE ===`);
    console.log(`Total DB records deleted: ${totalDeleted}`);
    console.log(`Total Storage files deleted: ${totalStorageFilesDeleted}`);
    console.log(`Auth users deleted: ${usersDeleted}/${userIdsToDelete.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Tenant deleted successfully - all data removed",
        totalDeleted,
        totalStorageFilesDeleted,
        usersDeleted,
        userDeletionErrors: userDeletionErrors.length > 0 ? userDeletionErrors : undefined,
        deletionResults,
        storageResults 
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
