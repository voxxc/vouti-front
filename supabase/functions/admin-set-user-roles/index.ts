import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { target_user_id, tenant_id, primary_role, additional_roles, roles } = body;

    // Input validation
    if (!target_user_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof target_user_id !== 'string' || target_user_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid target_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof tenant_id !== 'string' || tenant_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalPrimaryRole: string;
    let finalAdditionalRoles: string[] = [];

    if (primary_role) {
      finalPrimaryRole = primary_role;
      finalAdditionalRoles = additional_roles || [];
    } else if (roles && Array.isArray(roles) && roles.length > 0) {
      finalPrimaryRole = roles[0];
      finalAdditionalRoles = roles.slice(1);
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: primary_role or roles array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin in tenant
    const { data: callerRoles, error: callerRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('tenant_id', tenant_id);

    if (callerRolesError) {
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = callerRoles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem alterar permissões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Self-demotion protection
    if (callerUser.id === target_user_id) {
      const callerIsCurrentlyAdmin = callerRoles?.some(r => r.role === 'admin');
      const willRemainAdmin = finalPrimaryRole === 'admin' || finalAdditionalRoles.includes('admin');
      
      if (callerIsCurrentlyAdmin && !willRemainAdmin) {
        return new Response(
          JSON.stringify({ error: 'Você não pode remover sua própria permissão de administrador' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Last admin protection
    const { data: otherAdmins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('tenant_id', tenant_id)
      .eq('role', 'admin')
      .neq('user_id', target_user_id);

    const isRemovingAdminRole = finalPrimaryRole !== 'admin' && !finalAdditionalRoles.includes('admin');
    const noOtherAdmins = !otherAdmins || otherAdmins.length === 0;
    
    const { data: targetCurrentRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);
    
    const targetIsCurrentlyAdmin = targetCurrentRoles?.some(r => r.role === 'admin');
    
    if (targetIsCurrentlyAdmin && isRemovingAdminRole && noOtherAdmins) {
      return new Response(
        JSON.stringify({ error: 'Não é possível remover o último administrador do sistema' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to tenant
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', target_user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.tenant_id !== tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário não pertence ao seu tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate roles
    const validRoles = ['admin', 'advogado', 'comercial', 'financeiro', 'controller', 'agenda', 'reunioes'];
    
    if (!validRoles.includes(finalPrimaryRole)) {
      return new Response(
        JSON.stringify({ error: `Role principal inválida: ${finalPrimaryRole}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invalidAdditionalRoles = finalAdditionalRoles.filter(r => !validRoles.includes(r));
    if (invalidAdditionalRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Roles adicionais inválidas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueAdditionalRoles = [...new Set(finalAdditionalRoles.filter(r => r !== finalPrimaryRole))];

    // Delete existing roles
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao remover roles existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new roles
    const rolesToInsert = [
      {
        user_id: target_user_id,
        tenant_id: tenant_id,
        role: finalPrimaryRole,
        is_primary: true
      }
    ];

    for (const additionalRole of uniqueAdditionalRoles) {
      rolesToInsert.push({
        user_id: target_user_id,
        tenant_id: tenant_id,
        role: additionalRole,
        is_primary: false
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert(rolesToInsert)
      .select('role, is_primary');

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir novas roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confirm from DB
    const { data: confirmedRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_primary')
      .eq('user_id', target_user_id)
      .eq('tenant_id', tenant_id);

    const primaryConfirmed = confirmedRoles?.find(r => r.is_primary)?.role || finalPrimaryRole;
    const additionalConfirmed = confirmedRoles?.filter(r => !r.is_primary).map(r => r.role) || [];

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
    console.error('Unexpected error in admin-set-user-roles');
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
