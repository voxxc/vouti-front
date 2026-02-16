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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Não autenticado')
    }

    const { data: isAdmin, error: roleCheckError } = await supabaseClient
      .rpc('has_metal_role', { _user_id: user.id, _role: 'admin' })

    if (roleCheckError) {
      throw new Error('Erro ao verificar permissões')
    }

    if (!isAdmin) {
      throw new Error('Apenas administradores podem criar usuários')
    }

    const { login, password, full_name, setor, is_admin } = await req.json()

    // Input validation
    if (!login || !password || !full_name) {
      throw new Error('Login, senha e nome completo são obrigatórios')
    }

    if (typeof login !== 'string' || login.length > 50 || !/^[a-zA-Z0-9._-]+$/.test(login)) {
      throw new Error('Login inválido (max 50 caracteres, apenas letras, números, ponto, traço e underscore)')
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
      throw new Error('A senha deve ter entre 8 e 100 caracteres')
    }

    if (typeof full_name !== 'string' || full_name.length > 200) {
      throw new Error('Nome completo deve ter no máximo 200 caracteres')
    }

    if (setor && (typeof setor !== 'string' || setor.length > 100)) {
      throw new Error('Setor deve ter no máximo 100 caracteres')
    }

    const email = `${login}@metalsystem.local`

    // Check if user already exists
    const { data: existingProfile } = await supabaseClient
      .from('metal_profiles')
      .select('id')
      .eq('email', login)
      .single()

    if (existingProfile) {
      throw new Error('Já existe um usuário com este login')
    }

    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      }
    })

    if (createError) {
      throw createError
    }

    const { error: profileError } = await supabaseClient
      .from('metal_profiles')
      .insert({
        user_id: newUser.user.id,
        email: login,
        full_name,
        setor: setor || null,
      })

    if (profileError) {
      await supabaseClient.auth.admin.deleteUser(newUser.user.id)
      throw new Error('Erro ao criar perfil')
    }

    const roleToAdd = is_admin ? 'admin' : 'operador'

    const { error: roleError } = await supabaseClient
      .from('metal_user_roles')
      .insert({
        user_id: newUser.user.id,
        role: roleToAdd,
      })

    if (roleError) {
      await supabaseClient.from('metal_profiles').delete().eq('user_id', newUser.user.id)
      await supabaseClient.auth.admin.deleteUser(newUser.user.id)
      throw new Error('Erro ao adicionar role')
    }

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
    console.error('Error in create-metal-user')
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
