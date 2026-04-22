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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas Super Admins podem editar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, email, full_name, password } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email && !full_name && !password) {
      return new Response(
        JSON.stringify({ error: 'Nada a atualizar. Informe email, full_name ou password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password && (typeof password !== 'string' || password.length < 8 || password.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter entre 8 e 100 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (email && (typeof email !== 'string' || !email.includes('@') || email.length > 255)) {
      return new Response(
        JSON.stringify({ error: 'Email invalido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email uniqueness across all auth users
    if (email) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const conflict = list?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase() && u.id !== user_id
      );
      if (conflict) {
        return new Response(
          JSON.stringify({
            error: `O email ${email} ja esta cadastrado em outro usuario. Por uma limitacao do sistema de autenticacao (Supabase), cada email so pode existir em uma unica conta. Use um email diferente (ex: ${email.split('@')[0]}+novo@${email.split('@')[1] ?? 'dominio.com'}).`,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update auth user (email and/or password)
    const authPayload: Record<string, unknown> = {};
    if (email) authPayload.email = email;
    if (password) authPayload.password = password;

    if (Object.keys(authPayload).length > 0) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authPayload);
      if (updateAuthError) {
        const msg = updateAuthError.message || '';
        if (msg.toLowerCase().includes('already')) {
          return new Response(
            JSON.stringify({
              error: `O email ${email} ja esta cadastrado em outro usuario. Por uma limitacao do Supabase Auth, cada email deve ser unico no sistema.`,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar usuario: ' + msg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update profile (email and/or full_name)
    const profilePayload: Record<string, unknown> = {};
    if (email) profilePayload.email = email;
    if (full_name) profilePayload.full_name = full_name;

    if (Object.keys(profilePayload).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profilePayload)
        .eq('user_id', user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError.message);
        return new Response(
          JSON.stringify({ error: 'Usuario atualizado, mas houve falha ao atualizar o perfil: ' + profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in super-admin-update-user');
    return new Response(
      JSON.stringify({ error: 'Erro inesperado ao atualizar usuario' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});