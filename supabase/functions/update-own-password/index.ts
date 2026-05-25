import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Nao autenticado' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')

    // Verificar JWT (padrao do projeto)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub || !claimsData.claims.email) {
      return json({ error: 'Nao autenticado' }, 401)
    }
    const userId = claimsData.claims.sub as string
    const userEmail = claimsData.claims.email as string

    const body = await req.json().catch(() => ({}))
    const current_password: string | undefined = body?.current_password
    const new_password: string | undefined = body?.new_password

    if (!current_password || !new_password) {
      return json({ error: 'Senha atual e nova senha sao obrigatorias' }, 400)
    }
    if (new_password.length < 8) {
      return json({ error: 'Nova senha deve ter no minimo 8 caracteres' }, 400)
    }
    if (current_password === new_password) {
      return json({ error: 'A nova senha deve ser diferente da atual' }, 400)
    }

    console.log('[update-own-password] start', { userId, email: userEmail })

    // Validar senha atual via Auth REST (grant_type=password) SEM usar o SDK,
    // para nao rotacionar o refresh token ativo do navegador.
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email: userEmail, password: current_password }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '')
      let errCode = ''
      try { errCode = JSON.parse(errText)?.error_code || JSON.parse(errText)?.error || '' } catch {}
      console.log('[update-own-password] verify failed', { status: tokenRes.status, errCode })
      if (tokenRes.status === 400) {
        return json({ error: 'Senha atual incorreta' }, 400)
      }
      if (tokenRes.status === 429) {
        return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, 429)
      }
      return json({ error: 'Nao foi possivel validar a senha atual. Tente novamente.' }, 400)
    }

    // Revogar imediatamente a sessao recem criada pela validacao, para
    // nao invalidar a sessao ativa do navegador do usuario.
    try {
      const tokenJson = await tokenRes.json()
      const newAccessToken: string | undefined = tokenJson?.access_token
      if (newAccessToken) {
        await fetch(`${supabaseUrl}/auth/v1/logout?scope=local`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${newAccessToken}`,
          },
        }).catch(() => null)
      }
    } catch (_) { /* noop */ }

    // Atualizar senha via Admin API
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: new_password,
    })
    if (updateError) {
      console.error('[update-own-password] updateUserById error', updateError)
      return json({ error: 'Erro ao atualizar senha. Tente novamente.' }, 500)
    }

    console.log('[update-own-password] success', { userId })
    return json({ success: true, message: 'Senha atualizada' }, 200)
  } catch (error: any) {
    console.error('[update-own-password] unexpected error:', error?.message || error)
    return json({ error: 'Erro interno ao atualizar senha' }, 500)
  }
})