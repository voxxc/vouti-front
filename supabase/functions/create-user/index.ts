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
    const { email, password, full_name, role, additional_roles, tenant_id } = await req.json()

    // Validate input
    if (!email || !password || !full_name || !role) {
      throw new Error('Todos os campos são obrigatórios')
    }

    if (!tenant_id) {
      throw new Error('Tenant ID é obrigatório')
    }

    if (password.length < 6) {
      throw new Error('Senha deve ter no mínimo 6 caracteres')
    }

    // SECURITY: Prevent creation of users from other systems
    const restrictedDomains = ['@metalsystem.local', '@vouti.bio', '@vlink.bio']
    if (restrictedDomains.some(domain => email.toLowerCase().includes(domain))) {
      throw new Error('Este domínio de email é reservado para outro sistema')
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

    console.log('=== CREATE USER DEBUG ===')
    console.log('Email:', email)
    console.log('Role principal:', role)
    console.log('Additional roles recebidas:', additional_roles)
    console.log('Tenant ID:', tenant_id)

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
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update the profile created by the trigger with the correct data
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: full_name,
          email: email,
          tenant_id: tenant_id
        })
        .eq('user_id', newUser.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // Rollback: delete the user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        throw new Error('Erro ao atualizar perfil: ' + profileError.message)
      }

      console.log('Profile updated')

      // Preparar todas as roles (principal + adicionais)
      const allRoles = [role]
      if (additional_roles && Array.isArray(additional_roles)) {
        for (const additionalRole of additional_roles) {
          if (additionalRole !== role && !allRoles.includes(additionalRole)) {
            allRoles.push(additionalRole)
          }
        }
      }

      console.log('=== ROLES TO INSERT ===')
      console.log('All roles array:', allRoles)

      // Assign all roles
      const rolesToInsert = allRoles.map(r => ({
        user_id: newUser.user.id,
        role: r,
        tenant_id: tenant_id
      }))

      console.log('Roles to insert (formatted):', JSON.stringify(rolesToInsert, null, 2))

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert(rolesToInsert)

      if (roleError) {
        console.error('Error assigning roles:', roleError)
        // Rollback: delete profile and user
        await supabaseAdmin.from('profiles').delete().eq('user_id', newUser.user.id)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        throw new Error('Erro ao atribuir perfil: ' + roleError.message)
      }

      console.log('Roles assigned successfully:', allRoles)

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
