import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Validate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized: no token')
    }

    const token = authHeader.replace('Bearer ', '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!token || token === anonKey) {
      throw new Error('Invalid session')
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) throw new Error('Invalid or expired session')

    // Check SPN admin role
    const { data: isAdmin } = await supabaseAdmin.rpc('has_spn_role', {
      _user_id: caller.id,
      _role: 'admin'
    })
    if (!isAdmin) throw new Error('Only SPN admins can create users')

    const { action, ...body } = await req.json()

    // DELETE action
    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) throw new Error('user_id is required')

      // Remove SPN profile and roles (auth user stays)
      await supabaseAdmin.from('spn_user_roles').delete().eq('user_id', user_id)
      await supabaseAdmin.from('spn_student_levels').delete().eq('user_id', user_id)
      await supabaseAdmin.from('spn_word_translations').delete().eq('user_id', user_id)
      await supabaseAdmin.from('spn_profiles').delete().eq('user_id', user_id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // CREATE action (default)
    const { email, password, full_name, role } = body
    if (!email || !password || !full_name || !role) {
      throw new Error('All fields are required: email, password, full_name, role')
    }
    if (password.length < 6) throw new Error('Password must be at least 6 characters')

    const validRoles = ['admin', 'teacher', 'student']
    if (!validRoles.includes(role)) throw new Error('Invalid role')

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })
    if (createError || !newUser.user) {
      throw new Error(createError?.message || 'Failed to create user')
    }

    const userId = newUser.user.id

    try {
      // Create SPN profile
      const { error: profileError } = await supabaseAdmin.from('spn_profiles').insert({
        user_id: userId,
        full_name
      })
      if (profileError) throw profileError

      // Assign role
      const { error: roleError } = await supabaseAdmin.from('spn_user_roles').insert({
        user_id: userId,
        role
      })
      if (roleError) throw roleError

      return new Response(JSON.stringify({
        success: true,
        user: { id: userId, email, full_name, role }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (err) {
      // Rollback
      await supabaseAdmin.from('spn_user_roles').delete().eq('user_id', userId)
      await supabaseAdmin.from('spn_profiles').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error('Failed to setup user: ' + (err as Error).message)
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
