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
      throw new Error('Apenas administradores podem criar usuários')
    }

    const { email, password, full_name, setor, is_admin } = await req.json()

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name,
      }
    })

    if (createError) throw createError

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('metal_profiles')
      .insert({
        user_id: newUser.user.id,
        email,
        full_name,
        setor: setor || null,
      })

    if (profileError) throw profileError

    // Add admin role if needed
    if (is_admin) {
      const { error: roleError } = await supabaseClient
        .from('metal_user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'admin',
        })

      if (roleError) throw roleError
    } else {
      // Add operador role by default
      const { error: roleError } = await supabaseClient
        .from('metal_user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'operador',
        })

      if (roleError) throw roleError
    }

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
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