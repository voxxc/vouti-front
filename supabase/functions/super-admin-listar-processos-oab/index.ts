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

const TRIBUNAL_UF_MAP: Record<string, string> = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
  '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
  '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
  '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
  '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SE',
  '26': 'SP', '27': 'TO',
};

function extrairUF(tribunalSigla: string | null | undefined, numeroCnj?: string | null): string {
  if (tribunalSigla) {
    const m = tribunalSigla.match(/TJ([A-Z]{2})/);
    if (m) return m[1];
  }
  if (numeroCnj) {
    const match = numeroCnj.match(/\.\d{4}\.(\d)\.(\d{2})\./);
    if (match) {
      const seg = match[1];
      const cod = match[2];
      if (seg === '8' && TRIBUNAL_UF_MAP[cod]) return TRIBUNAL_UF_MAP[cod];
      return `${seg}.${cod}`;
    }
  }
  return 'N/I';
}

const PARTES_SIGILOSAS_REGEX = /^\s*(sigilo|sigiloso|sigilosa|segredo de justi[cç]a|sob sigilo)\s*$/i;

function isSigiloso(p: any): boolean {
  const capa = p?.judit_data?.lawsuit || p?.capa_completa || {};
  const pa = (p?.parte_ativa ?? capa?.parte_ativa ?? '').toString().trim();
  const pp = (p?.parte_passiva ?? capa?.parte_passiva ?? '').toString().trim();
  const partesMascaradas =
    PARTES_SIGILOSAS_REGEX.test(p?.parte_ativa || '') ||
    PARTES_SIGILOSAS_REGEX.test(p?.parte_passiva || '') ||
    PARTES_SIGILOSAS_REGEX.test(capa?.parte_ativa || '') ||
    PARTES_SIGILOSAS_REGEX.test(capa?.parte_passiva || '');
  if ((capa?.secrecy_level ?? 0) >= 1 || capa?.justice_secret === true || partesMascaradas) {
    return true;
  }
  // capa cega
  if (!pa && !pp) {
    const partesCompletas = p?.partes_completas;
    const semPartes = !partesCompletas || (Array.isArray(partesCompletas) && partesCompletas.length === 0);
    const steps = capa?.steps || p?.judit_data?.lawsuit?.steps || [];
    const semAndamentosNaCapa = !Array.isArray(steps) || steps.length === 0;
    if (semPartes && semAndamentosNaCapa) return true;
  }
  return false;
}

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
          'id, numero_cnj, parte_ativa, parte_passiva, tribunal_sigla, monitoramento_ativo, ultima_atualizacao_detalhes, super_admin_atualizado_em, judit_data, partes_completas, capa_completa',
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
    const processos = all.map((p) => {
      const is_sigiloso = isSigiloso(p);
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      // Não devolver judit_data/partes_completas/capa_completa para reduzir payload
      const { judit_data, partes_completas, capa_completa, ...rest } = p;
      return { ...rest, total_andamentos: counts[p.id] || 0, is_sigiloso, uf };
    });

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