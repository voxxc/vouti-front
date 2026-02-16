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

    const { data: adminRole } = await supabaseClient
      .from('metal_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      throw new Error('Apenas administradores podem atualizar usuários')
    }

    const { user_id, email, password, full_name, setor } = await req.json()

    // Input validation
    if (!user_id || typeof user_id !== 'string' || user_id.length > 100) {
      throw new Error('user_id inválido')
    }

    if (email !== undefined && (typeof email !== 'string' || email.length > 50 || !/^[a-zA-Z0-9._-]+$/.test(email))) {
      throw new Error('Login inválido')
    }

    if (password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 100)) {
      throw new Error('Senha deve ter entre 8 e 100 caracteres')
    }

    if (full_name !== undefined && (typeof full_name !== 'string' || full_name.length > 200)) {
      throw new Error('Nome deve ter no máximo 200 caracteres')
    }

    if (setor !== undefined && setor !== null && (typeof setor !== 'string' || setor.length > 100)) {
      throw new Error('Setor deve ter no máximo 100 caracteres')
    }

    // Update user email/password if provided
    const updateData: any = {}
    if (email) updateData.email = email
    if (password) updateData.password = password
    if (full_name) updateData.user_metadata = { full_name }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        updateData
      )

      if (updateError) {
        throw updateError
      }
    }

    // Update profile
    const profileUpdate: any = {}
    if (email !== undefined) profileUpdate.email = email
    if (full_name !== undefined) profileUpdate.full_name = full_name
    if (setor !== undefined) profileUpdate.setor = setor

    const { error: profileError } = await supabaseClient
      .from('metal_profiles')
      .update(profileUpdate)
      .eq('user_id', user_id)

    if (profileError) {
      throw profileError
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in update-metal-user')
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
