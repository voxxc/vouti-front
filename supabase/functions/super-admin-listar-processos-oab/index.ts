import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  tenant_id: z.string().uuid(),
  aba: z.enum(['total', 'atualizado']).optional().default('total'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'no_auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userRes.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: sa } = await admin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!sa) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { tenant_id, aba } = parsed.data;

    // Janela de 7 dias para a marcação "atualizado"
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Pagina manualmente para evitar limite de 1000 linhas
    const PAGE = 1000;
    const all: any[] = [];
    let from = 0;
    while (true) {
      let query = admin
        .from('processos_oab')
        .select(
          'id, numero_cnj, parte_ativa, parte_passiva, tribunal_sigla, monitoramento_ativo, ultima_atualizacao_detalhes, super_admin_atualizado_em',
        )
        .eq('tenant_id', tenant_id);

      if (aba === 'atualizado') {
        query = query
          .gte('super_admin_atualizado_em', seteDiasAtras)
          .order('super_admin_atualizado_em', { ascending: false });
      } else {
        // total: nulo OU fora da janela de 7 dias
        query = query
          .or(`super_admin_atualizado_em.is.null,super_admin_atualizado_em.lt.${seteDiasAtras}`)
          .order('numero_cnj', { ascending: true });
      }

      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Conta andamentos por processo (uma chamada agregada)
    const ids = all.map((p) => p.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const CHUNK = 80;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { data: rows, error: cErr } = await admin
          .from('processos_oab_andamentos')
          .select('processo_oab_id')
          .in('processo_oab_id', slice);
        if (cErr) throw cErr;
        for (const r of rows || []) {
          counts[(r as any).processo_oab_id] = (counts[(r as any).processo_oab_id] || 0) + 1;
        }
      }
    }
    const processos = all.map((p) => ({ ...p, total_andamentos: counts[p.id] || 0 }));

    return new Response(JSON.stringify({ processos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[super-admin-listar-processos-oab]', e);
    return new Response(JSON.stringify({ error: 'internal', message: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});