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

    // Parse body
    const { target_user_id, tenant_id, roles } = await req.json();
    
    console.log('admin-set-user-roles: Request body:', { target_user_id, tenant_id, roles });

    if (!target_user_id || !tenant_id || !roles || !Array.isArray(roles) || roles.length === 0) {
      console.error('admin-set-user-roles: Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, tenant_id, roles' }),
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
    const invalidRoles = roles.filter(r => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      console.error('admin-set-user-roles: Invalid roles:', invalidRoles);
      return new Response(
        JSON.stringify({ error: `Roles inválidas: ${invalidRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // PASSO 2: Inserir as novas roles
    const uniqueRoles = [...new Set(roles)];
    const rolesToInsert = uniqueRoles.map(role => ({
      user_id: target_user_id,
      tenant_id: tenant_id,
      role: role
    }));

    console.log('admin-set-user-roles: Inserting new roles:', rolesToInsert);

    const { data: insertedRoles, error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert(rolesToInsert)
      .select('role');

    if (insertError) {
      console.error('admin-set-user-roles: Error inserting roles:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir novas roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('admin-set-user-roles: Roles inserted successfully:', insertedRoles);

    // PASSO 3: Confirmar lendo do banco
    const { data: confirmedRoles, error: confirmError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);

    if (confirmError) {
      console.error('admin-set-user-roles: Error confirming roles:', confirmError);
    }

    const rolesApplied = confirmedRoles?.map(r => r.role) || [];
    console.log('admin-set-user-roles: Final confirmed roles:', rolesApplied);

    return new Response(
      JSON.stringify({ 
        success: true, 
        roles_applied: rolesApplied,
        message: `${rolesApplied.length} role(s) aplicada(s) com sucesso`
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
