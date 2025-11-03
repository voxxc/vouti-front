import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Iniciando criação de usuário...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user making the request is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('❌ Erro de autenticação:', userError)
      throw new Error('Não autenticado')
    }

    console.log('✅ Usuário autenticado:', user.id)

    // Check if user is admin using the security definer function
    const { data: isAdmin, error: roleCheckError } = await supabaseClient
      .rpc('has_metal_role', { _user_id: user.id, _role: 'admin' })

    if (roleCheckError) {
      console.error('❌ Erro ao verificar role:', roleCheckError)
      throw new Error('Erro ao verificar permissões')
    }

    if (!isAdmin) {
      console.error('❌ Usuário não é admin:', user.id)
      throw new Error('Apenas administradores podem criar usuários')
    }

    console.log('✅ Usuário é administrador')

    const { login, password, full_name, setor, is_admin } = await req.json()

    console.log('📝 Dados recebidos:', { login, full_name, setor, is_admin })

    // Validações
    if (!login || !password || !full_name) {
      throw new Error('Login, senha e nome completo são obrigatórios')
    }

    if (password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres')
    }

    // Create a fictional email based on login
    const email = `${login}@metalsystem.local`

    console.log('📧 Email gerado:', email)

    // Check if user already exists
    const { data: existingProfile } = await supabaseClient
      .from('metal_profiles')
      .select('id')
      .eq('email', login)
      .single()

    if (existingProfile) {
      throw new Error('Já existe um usuário com este login')
    }

    console.log('✅ Login disponível')

    // Create the user using admin API
    console.log('👤 Criando usuário no Auth...')
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name,
      }
    })

    if (createError) {
      console.error('❌ Erro ao criar usuário no Auth:', createError)
      throw createError
    }

    console.log('✅ Usuário criado no Auth:', newUser.user.id)

    // Create profile with login stored
    console.log('👤 Criando perfil...')
    const { error: profileError } = await supabaseClient
      .from('metal_profiles')
      .insert({
        user_id: newUser.user.id,
        email: login, // Store login instead of email
        full_name,
        setor: setor || null,
      })

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError)
      // Tentar deletar o usuário criado
      await supabaseClient.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Erro ao criar perfil: ${profileError.message}`)
    }

    console.log('✅ Perfil criado com sucesso')

    // Add role (admin or operador)
    const roleToAdd = is_admin ? 'admin' : 'operador'
    console.log(`🔐 Adicionando role: ${roleToAdd}`)

    const { error: roleError } = await supabaseClient
      .from('metal_user_roles')
      .insert({
        user_id: newUser.user.id,
        role: roleToAdd,
      })

    if (roleError) {
      console.error('❌ Erro ao adicionar role:', roleError)
      // Tentar deletar perfil e usuário
      await supabaseClient.from('metal_profiles').delete().eq('user_id', newUser.user.id)
      await supabaseClient.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Erro ao adicionar role: ${roleError.message}`)
    }

    console.log('✅ Role adicionada com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: login,
          full_name,
          role: roleToAdd
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})