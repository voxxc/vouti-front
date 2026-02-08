import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: superAdmin, error: superAdminError } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      console.error('Super admin check error:', superAdminError);
      return new Response(
        JSON.stringify({ error: 'Only super admins can create tenants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const {
      name,
      slug,
      email_domain,
      system_type_id,
      admin_email,
      admin_password,
      admin_name,
      plano,
      limite_oabs_personalizado,
    } = await req.json();

    console.log('Creating tenant with admin:', { name, slug, email_domain, system_type_id, admin_email, admin_name, plano, limite_oabs_personalizado });

    // Validate required fields
    if (!name || !slug || !system_type_id || !admin_email || !admin_password || !admin_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, slug, system_type_id, admin_email, admin_password, admin_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (admin_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if slug already exists
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'A tenant with this slug already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar todos os super admins
    const { data: superAdminUserIds } = await supabaseAdmin
      .from('super_admins')
      .select('user_id');

    const superAdminIds = superAdminUserIds?.map(sa => sa.user_id) || [];

    // Verificar se email existe em auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === admin_email.toLowerCase());

    // Verificar se o email pertence a um super admin
    const isSuperAdminEmail = existingAuthUser && superAdminIds.includes(existingAuthUser.id);

    // Check if admin email already exists (excluindo super admins)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', admin_email)
      .maybeSingle();

    // Bloqueia APENAS se existir, não for super admin E o auth user existir
    if (existingProfile && !superAdminIds.includes(existingProfile.user_id)) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create tenant with plan
    console.log('Step 1: Creating tenant...');
    const tenantPlano = plano || 'solo';
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name,
        slug,
        email_domain: email_domain || null,
        system_type_id,
        is_active: true,
        plano: tenantPlano,
        limite_oabs_personalizado: (tenantPlano === 'expansao' || tenantPlano === 'enterprise') ? limite_oabs_personalizado : null,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: `Error creating tenant: ${tenantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant created:', tenant.id);

    let adminUserId: string;

    // Step 2: Create admin user OR reuse super admin's auth user
    if (isSuperAdminEmail && existingAuthUser) {
      // Reutilizar o auth user existente do super admin
      console.log('Step 2: Reusing super admin auth user for tenant admin...');
      adminUserId = existingAuthUser.id;
      console.log('Reusing existing super admin user:', adminUserId);
    } else {
      // Criar novo usuário
      console.log('Step 2: Creating new admin user...');
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          full_name: admin_name,
        },
      });

      if (userError || !newUser.user) {
        console.error('Error creating user:', userError);
        // Rollback: delete tenant
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ error: `Error creating admin user: ${userError?.message || 'Unknown error'}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      adminUserId = newUser.user.id;
      console.log('Admin user created:', adminUserId);
    }

    // Step 3: Create NEW profile for this tenant (não faz upsert para super admin)
    console.log('Step 3: Creating profile for tenant...');
    
    if (isSuperAdminEmail) {
      // Para super admin, verificar se já existe profile para este tenant
      // O super admin mantém seu profile original (tenant_id = null)
      // Mas criamos um novo profile entry se necessário - na verdade, não podemos ter 2 profiles
      // Então vamos apenas criar o admin role e deixar o super admin acessar via super admin panel
      console.log('Super admin detected - skipping profile update to preserve super admin access');
    } else {
      // Usuário novo - criar profile normalmente
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: adminUserId,
          email: admin_email,
          full_name: admin_name,
          tenant_id: tenant.id,
        }, {
          onConflict: 'user_id',
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Rollback: delete user and tenant
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ error: `Error updating profile: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Profile created with tenant_id');
    }

    // Step 4: Create admin role for the tenant
    console.log('Step 4: Creating admin role...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: adminUserId,
        role: 'admin',
        tenant_id: tenant.id,
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Rollback
      if (!isSuperAdminEmail) {
        await supabaseAdmin.from('profiles').delete().eq('user_id', adminUserId);
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      }
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: `Error creating admin role: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin role created successfully');

    // Build response message
    const responseMessage = isSuperAdminEmail
      ? `Tenant "${name}" created. Super admin "${admin_name}" (${admin_email}) now has admin access to this tenant via super admin panel.`
      : `Tenant "${name}" created successfully with admin "${admin_name}" (${admin_email})`;

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plano: tenantPlano,
        },
        admin: {
          id: adminUserId,
          email: admin_email,
          name: admin_name,
          is_super_admin: isSuperAdminEmail,
        },
        message: responseMessage,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
