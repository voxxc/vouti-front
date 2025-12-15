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
      console.error('No authorization header provided')
      throw new Error('Sem autorizacao')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Nao autenticado')
    }

    console.log('Authenticated user:', user.id, user.email)

    // Buscar tenant do admin primeiro
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (adminProfileError || !adminProfile?.tenant_id) {
      console.error('Error fetching admin profile:', adminProfileError)
      throw new Error('Erro ao buscar perfil do administrador')
    }

    console.log('Admin tenant_id:', adminProfile.tenant_id)

    // Verificar se o usuario solicitante e admin NO MESMO TENANT
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role_in_tenant', {
      _user_id: user.id,
      _role: 'admin',
      _tenant_id: adminProfile.tenant_id
    })

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      throw new Error('Erro ao verificar permissoes')
    }

    console.log('Is admin in tenant:', isAdmin)

    if (!isAdmin) {
      throw new Error('Sem permissao de administrador')
    }

    const { user_id, new_password } = await req.json()

    console.log('Target user_id:', user_id)

    if (!user_id || !new_password) {
      throw new Error('ID do usuario e nova senha sao obrigatorios')
    }

    if (new_password.length < 6) {
      throw new Error('Senha deve ter no minimo 6 caracteres')
    }

    // Buscar tenant do usuario alvo
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user_id)
      .single()

    if (targetProfileError || !targetProfile?.tenant_id) {
      console.error('Error fetching target profile:', targetProfileError)
      throw new Error('Usuario alvo nao encontrado')
    }

    console.log('Target user tenant_id:', targetProfile.tenant_id)

    // Validar mesmo tenant
    if (adminProfile.tenant_id !== targetProfile.tenant_id) {
      console.error('Tenant mismatch - Admin:', adminProfile.tenant_id, 'Target:', targetProfile.tenant_id)
      throw new Error('Usuario nao pertence ao seu tenant')
    }

    console.log('Updating password for user:', user_id)

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw new Error('Erro ao atualizar senha: ' + updateError.message)
    }

    console.log('Password updated successfully for user:', user_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha atualizada com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in update-user-password function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao atualizar senha'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
