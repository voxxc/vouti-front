import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUDIT_BASE = 'https://tracking.production.judit.io/tracking';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!superAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a Super Admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tracking_id: string | undefined = body?.tracking_id;
    const tipo: string = body?.tipo ?? 'Órfão';
    const tenant_id: string | null = body?.tenant_id ?? null;

    if (!tracking_id || typeof tracking_id !== 'string') {
      return new Response(JSON.stringify({ error: 'tracking_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[judit-apagar-tracking]', { tracking_id, tipo, tenant_id, userId });

    // 1) DELETE na Judit
    let juditStatus = 0;
    try {
      const resp = await fetch(`${JUDIT_BASE}/${tracking_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'api-key': juditApiKey,
        },
      });
      juditStatus = resp.status;
      if (!resp.ok && resp.status !== 404) {
        const txt = await resp.text();
        console.error('[judit-apagar-tracking] Judit error', resp.status, txt);
      }
    } catch (e) {
      console.error('[judit-apagar-tracking] fetch fail', e);
    }

    // 2) Limpeza local
    const localUpdates: Record<string, number> = {
      processo_monitoramento_judit: 0,
      processos_oab: 0,
      tenant_banco_ids: 0,
    };

    if (tipo === 'CNJ' || tipo === 'OAB') {
      const { data: pmj } = await supabaseAdmin
        .from('processo_monitoramento_judit')
        .update({ monitoramento_ativo: false, updated_at: new Date().toISOString() })
        .eq('tracking_id', tracking_id)
        .select('id');
      localUpdates.processo_monitoramento_judit = pmj?.length ?? 0;

      const { data: poab } = await supabaseAdmin
        .from('processos_oab')
        .update({ monitoramento_ativo: false, tracking_id: null, tracking_request_id: null })
        .eq('tracking_id', tracking_id)
        .select('id');
      localUpdates.processos_oab = poab?.length ?? 0;
    }

    // tenant_banco_ids: mover tracking → tracking_desativado
    const { data: tbiRows } = await supabaseAdmin
      .from('tenant_banco_ids')
      .select('id, tenant_id, referencia_id, descricao, metadata, tipo')
      .eq('external_id', tracking_id);

    if (tbiRows && tbiRows.length > 0) {
      for (const row of tbiRows) {
        if (row.tipo === 'tracking') {
          await supabaseAdmin
            .from('tenant_banco_ids')
            .update({
              tipo: 'tracking_desativado',
              metadata: {
                ...(row.metadata ?? {}),
                tracking_id,
                desativado_em: new Date().toISOString(),
                motivo: 'super_admin_apagar_tracking',
                desativado_por: userId,
              },
            })
            .eq('id', row.id);
          localUpdates.tenant_banco_ids++;
        }
      }
    } else if (tipo === 'Órfão' || tipo === 'Desativado') {
      // nada a fazer
    }

    return new Response(
      JSON.stringify({ success: true, juditStatus, localUpdates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[judit-apagar-tracking] erro', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});