import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Initialize Supabase client with service role (admin privileges)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the requesting user's token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Sem autorização')
    }

    // Verify the requesting user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Não autenticado')
    }

    // Check if the requesting user is an admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (!isAdmin) {
      throw new Error('Sem permissão de administrador')
    }

    // Parse request body
    const { email, password, full_name, role } = await req.json()

    // Validate input
    if (!email || !password || !full_name || !role) {
      throw new Error('Todos os campos são obrigatórios')
    }

    if (password.length < 6) {
      throw new Error('Senha deve ter no mínimo 6 caracteres')
    }

    const validRoles = ['admin', 'advogado', 'comercial', 'financeiro', 'controller', 'agenda']
    if (!validRoles.includes(role)) {
      throw new Error('Perfil inválido')
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single()

    if (existingUser) {
      throw new Error('Email já cadastrado')
    }

    console.log('Creating user with email:', email)

    // Create user using Admin API (does not auto-login)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      throw new Error(createError?.message || 'Erro ao criar usuário')
    }

    console.log('User created:', newUser.user.id)

    try {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: email,
          full_name: full_name,
          avatar_url: null
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Rollback: delete the user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        throw new Error('Erro ao criar perfil: ' + profileError.message)
      }

      console.log('Profile created')

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role
        })

      if (roleError) {
        console.error('Error assigning role:', roleError)
        // Rollback: delete profile and user
        await supabaseAdmin.from('profiles').delete().eq('user_id', newUser.user.id)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        throw new Error('Erro ao atribuir perfil: ' + roleError.message)
      }

      console.log('Role assigned successfully')

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: newUser.user.id,
            email: email,
            full_name: full_name,
            role: role
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } catch (error) {
      console.error('Transaction error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao criar usuário'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
