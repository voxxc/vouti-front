import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: superAdmin, error: superAdminError } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create tenants' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
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
    } = body;

    // Input validation
    if (!name || !slug || !system_type_id || !admin_email || !admin_password || !admin_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, slug, system_type_id, admin_email, admin_password, admin_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths and formats
    if (typeof name !== 'string' || name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Name must be a string with max 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof slug !== 'string' || slug.length > 50 || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response(
        JSON.stringify({ error: 'Slug must contain only lowercase letters, numbers, and hyphens (max 50 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof admin_email !== 'string' || admin_email.length > 255 || !admin_email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof admin_password !== 'string' || admin_password.length < 8 || admin_password.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Password must be between 8 and 100 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof admin_name !== 'string' || admin_name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Admin name must be max 200 characters' }),
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

    const { data: superAdminUserIds } = await supabaseAdmin
      .from('super_admins')
      .select('user_id');

    const superAdminIds = superAdminUserIds?.map(sa => sa.user_id) || [];

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === admin_email.toLowerCase());

    const isSuperAdminEmail = existingAuthUser && superAdminIds.includes(existingAuthUser.id);

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', admin_email)
      .maybeSingle();

    if (existingProfile && !superAdminIds.includes(existingProfile.user_id)) {
      return new Response(
        JSON.stringify({ error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create tenant
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
      console.error('Error creating tenant');
      return new Response(
        JSON.stringify({ error: 'Error creating tenant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let adminUserId: string;

    // Step 2: Create admin user OR reuse super admin's auth user
    if (isSuperAdminEmail && existingAuthUser) {
      adminUserId = existingAuthUser.id;
    } else {
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          full_name: admin_name,
        },
      });

      if (userError || !newUser.user) {
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ error: 'Error creating admin user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      adminUserId = newUser.user.id;
    }

    // Step 3: Create profile
    if (isSuperAdminEmail) {
      // Super admin - skip profile update to preserve super admin access
    } else {
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
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ error: 'Error updating profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 4: Create admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: adminUserId,
        role: 'admin',
        tenant_id: tenant.id,
      });

    if (roleError) {
      if (!isSuperAdminEmail) {
        await supabaseAdmin.from('profiles').delete().eq('user_id', adminUserId);
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      }
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Error creating admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseMessage = isSuperAdminEmail
      ? `Tenant "${name}" created. Super admin now has admin access.`
      : `Tenant "${name}" created successfully with admin "${admin_name}"`;

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
    console.error('Unexpected error in create-tenant-with-admin');
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
