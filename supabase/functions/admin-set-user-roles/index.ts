import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client com service role para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar autenticação do request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('admin-set-user-roles: Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar client com token do usuário para verificar permissões
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Obter usuário autenticado
    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callerUser) {
      console.error('admin-set-user-roles: User not authenticated', userError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('admin-set-user-roles: Caller user ID:', callerUser.id);

    // Parse body - NOVO CONTRATO: primary_role + additional_roles
    const body = await req.json();
    const { target_user_id, tenant_id, primary_role, additional_roles, roles } = body;
    
    console.log('admin-set-user-roles: Request body:', { target_user_id, tenant_id, primary_role, additional_roles, roles });

    if (!target_user_id || !tenant_id) {
      console.error('admin-set-user-roles: Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Suportar tanto o novo contrato (primary_role + additional_roles) quanto o antigo (roles array)
    let finalPrimaryRole: string;
    let finalAdditionalRoles: string[] = [];

    if (primary_role) {
      // Novo contrato
      finalPrimaryRole = primary_role;
      finalAdditionalRoles = additional_roles || [];
    } else if (roles && Array.isArray(roles) && roles.length > 0) {
      // Contrato antigo - primeira role é a principal
      finalPrimaryRole = roles[0];
      finalAdditionalRoles = roles.slice(1);
    } else {
      console.error('admin-set-user-roles: No roles provided');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: primary_role or roles array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o chamador é admin no tenant usando service role
    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('tenant_id', tenant_id);

    if (callerRolesError) {
      console.error('admin-set-user-roles: Error checking caller roles:', callerRolesError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = callerRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('admin-set-user-roles: Caller is not admin in tenant', callerRoles);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem alterar permissões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('admin-set-user-roles: Caller is admin, proceeding...');

    // PROTEÇÃO 1: Impedir que admin remova sua própria role de admin
    if (callerUser.id === target_user_id) {
      const callerIsCurrentlyAdmin = callerRoles?.some(r => r.role === 'admin');
      const willRemainAdmin = finalPrimaryRole === 'admin' || finalAdditionalRoles.includes('admin');
      
      if (callerIsCurrentlyAdmin && !willRemainAdmin) {
        console.error('admin-set-user-roles: Admin trying to self-demote');
        return new Response(
          JSON.stringify({ error: 'Você não pode remover sua própria permissão de administrador' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PROTEÇÃO 2: Garantir que sempre haja pelo menos 1 admin no tenant
    const { data: otherAdmins, error: otherAdminsError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('tenant_id', tenant_id)
      .eq('role', 'admin')
      .neq('user_id', target_user_id);

    if (otherAdminsError) {
      console.error('admin-set-user-roles: Error checking other admins:', otherAdminsError);
    }

    const isRemovingAdminRole = finalPrimaryRole !== 'admin' && !finalAdditionalRoles.includes('admin');
    const noOtherAdmins = !otherAdmins || otherAdmins.length === 0;
    
    // Buscar role atual do target user para verificar se está removendo admin
    const { data: targetCurrentRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);
    
    const targetIsCurrentlyAdmin = targetCurrentRoles?.some(r => r.role === 'admin');
    
    if (targetIsCurrentlyAdmin && isRemovingAdminRole && noOtherAdmins) {
      console.error('admin-set-user-roles: Trying to remove last admin');
      return new Response(
        JSON.stringify({ error: 'Não é possível remover o último administrador do sistema' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário alvo pertence ao tenant
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', target_user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      console.error('admin-set-user-roles: Target user not found:', targetProfileError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.tenant_id !== tenant_id) {
      console.error('admin-set-user-roles: Target user belongs to different tenant');
      return new Response(
        JSON.stringify({ error: 'Usuário não pertence ao seu tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar roles
    const validRoles = ['admin', 'advogado', 'comercial', 'financeiro', 'controller', 'agenda', 'reunioes'];
    
    if (!validRoles.includes(finalPrimaryRole)) {
      console.error('admin-set-user-roles: Invalid primary role:', finalPrimaryRole);
      return new Response(
        JSON.stringify({ error: `Role principal inválida: ${finalPrimaryRole}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invalidAdditionalRoles = finalAdditionalRoles.filter(r => !validRoles.includes(r));
    if (invalidAdditionalRoles.length > 0) {
      console.error('admin-set-user-roles: Invalid additional roles:', invalidAdditionalRoles);
      return new Response(
        JSON.stringify({ error: `Roles adicionais inválidas: ${invalidAdditionalRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove duplicates and ensure primary is not in additional
    const uniqueAdditionalRoles = [...new Set(finalAdditionalRoles.filter(r => r !== finalPrimaryRole))];

    console.log('admin-set-user-roles: Final roles:', { primary: finalPrimaryRole, additional: uniqueAdditionalRoles });

    // PASSO 1: Deletar todas as roles existentes do usuário neste tenant
    console.log('admin-set-user-roles: Deleting existing roles for user in tenant...');
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);

    if (deleteError) {
      console.error('admin-set-user-roles: Error deleting roles:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao remover roles existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('admin-set-user-roles: Existing roles deleted successfully');

    // PASSO 2: Inserir role principal com is_primary = true
    const rolesToInsert = [
      {
        user_id: target_user_id,
        tenant_id: tenant_id,
        role: finalPrimaryRole,
        is_primary: true
      }
    ];

    // PASSO 3: Inserir roles adicionais com is_primary = false
    for (const additionalRole of uniqueAdditionalRoles) {
      rolesToInsert.push({
        user_id: target_user_id,
        tenant_id: tenant_id,
        role: additionalRole,
        is_primary: false
      });
    }

    console.log('admin-set-user-roles: Inserting roles:', rolesToInsert);

    const { data: insertedRoles, error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert(rolesToInsert)
      .select('role, is_primary');

    if (insertError) {
      console.error('admin-set-user-roles: Error inserting roles:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir novas roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('admin-set-user-roles: Roles inserted successfully:', insertedRoles);

    // PASSO 4: Confirmar lendo do banco
    const { data: confirmedRoles, error: confirmError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_primary')
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);

    if (confirmError) {
      console.error('admin-set-user-roles: Error confirming roles:', confirmError);
    }

    const primaryConfirmed = confirmedRoles?.find(r => r.is_primary)?.role || finalPrimaryRole;
    const additionalConfirmed = confirmedRoles?.filter(r => !r.is_primary).map(r => r.role) || [];
    
    console.log('admin-set-user-roles: Final confirmed roles:', { primary: primaryConfirmed, additional: additionalConfirmed });

    return new Response(
      JSON.stringify({ 
        success: true, 
        primary_role: primaryConfirmed,
        additional_roles: additionalConfirmed,
        roles_applied: confirmedRoles?.map(r => r.role) || [],
        message: `Perfil ${primaryConfirmed}${additionalConfirmed.length > 0 ? ` + ${additionalConfirmed.length} permissão(ões) adicional(is)` : ''} aplicado com sucesso`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('admin-set-user-roles: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});