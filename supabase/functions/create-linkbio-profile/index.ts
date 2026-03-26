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

    // Validate caller is super admin
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

    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create link-in-bio profiles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { username, full_name, email, password, bio } = await req.json();

    // Validate required fields
    if (!username || !full_name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'username, full_name, email e password são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check username uniqueness
    const { data: existingProfile } = await supabaseAdmin
      .from('link_profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: `Username "${username}" já está em uso` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user with linkbio metadata
    // The handle_new_user trigger will create link_profiles and link_user_roles
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        app: 'linkbio',
        username: username.toLowerCase(),
        full_name,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update bio if provided (trigger creates profile without bio)
    if (bio) {
      await supabaseAdmin
        .from('link_profiles')
        .update({ bio })
        .eq('user_id', newUser.user.id);
    }

    // Fetch created profile
    const { data: profile } = await supabaseAdmin
      .from('link_profiles')
      .select('*')
      .eq('user_id', newUser.user.id)
      .single();

    return new Response(
      JSON.stringify({ profile, user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
