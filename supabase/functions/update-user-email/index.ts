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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Sem autorizacao')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Nao autenticado')
    }

    // Verificar se o usuario solicitante e admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (!isAdmin) {
      throw new Error('Sem permissao de administrador')
    }

    const { user_id, new_email } = await req.json()

    if (!user_id || !new_email) {
      throw new Error('ID do usuario e novo email sao obrigatorios')
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(new_email)) {
      throw new Error('Formato de email invalido')
    }

    // Buscar tenant do admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    // Buscar tenant do usuario alvo
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user_id)
      .single()

    // Validar mesmo tenant
    if (!adminProfile?.tenant_id || !targetProfile?.tenant_id) {
      throw new Error('Erro ao verificar tenant dos usuarios')
    }

    if (adminProfile.tenant_id !== targetProfile.tenant_id) {
      throw new Error('Usuario nao pertence ao seu tenant')
    }

    console.log('Updating email for user:', user_id, 'to:', new_email)

    // Atualizar email em auth.users
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: new_email }
    )

    if (updateError) {
      console.error('Error updating email in auth:', updateError)
      throw new Error('Erro ao atualizar email: ' + updateError.message)
    }

    // Atualizar email na tabela profiles tambem
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: new_email })
      .eq('user_id', user_id)

    if (profileError) {
      console.error('Error updating email in profiles:', profileError)
      // Nao falha a operacao se profiles falhar, pois o auth ja foi atualizado
    }

    console.log('Email updated successfully for user:', user_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email atualizado com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in update-user-email function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao atualizar email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
