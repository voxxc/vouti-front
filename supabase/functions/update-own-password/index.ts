import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sem autorizacao')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user || !user.email) throw new Error('Nao autenticado')

    const body = await req.json().catch(() => ({}))
    const current_password: string | undefined = body?.current_password
    const new_password: string | undefined = body?.new_password

    if (!current_password || !new_password) {
      throw new Error('Senha atual e nova senha sao obrigatorias')
    }
    if (new_password.length < 8) {
      throw new Error('Nova senha deve ter no minimo 8 caracteres')
    }
    if (current_password === new_password) {
      throw new Error('A nova senha deve ser diferente da atual')
    }

    // Validar senha atual via signIn isolado (cliente sem persistencia)
    const verifier = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    })
    if (signInError) {
      return new Response(
        JSON.stringify({ error: 'Senha atual incorreta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    })
    if (updateError) {
      throw new Error('Erro ao atualizar senha: ' + updateError.message)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Senha atualizada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('update-own-password error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro ao atualizar senha' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})