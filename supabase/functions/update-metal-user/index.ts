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

    // Verify the user making the request is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Não autenticado')
    }

    // Check if user is admin
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

      if (updateError) throw updateError
    }

    // Update profile
    const { error: profileError } = await supabaseClient
      .from('metal_profiles')
      .update({
        email: email || undefined,
        full_name: full_name || undefined,
        setor: setor !== undefined ? setor : undefined,
      })
      .eq('user_id', user_id)

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})