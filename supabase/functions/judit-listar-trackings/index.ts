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

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const status: string = body.status ?? 'all'; // 'active' | 'paused' | 'all'
    const page: number = Math.max(1, Number(body.page ?? 1));
    const pageSize: number = Math.min(100, Math.max(1, Number(body.pageSize ?? 100)));
    const fetchAll: boolean = body.fetchAll === true;

    // Buscar Judit (paginando se fetchAll)
    const fetchPage = async (p: number) => {
      const url = new URL(JUDIT_BASE);
      url.searchParams.set('page', String(p));
      url.searchParams.set('page_size', String(pageSize));
      if (status === 'paused') url.searchParams.set('status', 'paused');
      if (status === 'active') url.searchParams.set('status', 'active');
      const r = await fetch(url.toString(), {
        headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Judit GET /tracking falhou (${r.status}): ${text}`);
      }
      return await r.json();
    };

    const allItems: any[] = [];
    let totalReported: number | null = null;
    if (fetchAll) {
      let p = 1;
      // segurança: até 50 páginas (5000 trackings)
      while (p <= 50) {
        const data = await fetchPage(p);
        const items = data?.page_data ?? data?.data ?? data?.results ?? data?.items ?? [];
        if (totalReported == null) totalReported = data?.all_count ?? data?.total ?? null;
        allItems.push(...items);
        if (!items.length || items.length < pageSize) break;
        p++;
      }
    } else {
      const data = await fetchPage(page);
      const items = data?.page_data ?? data?.data ?? data?.results ?? data?.items ?? [];
      totalReported = data?.all_count ?? data?.total ?? null;
      allItems.push(...items);
    }

    // Coletar tracking_ids para enriquecimento local
    const ids: string[] = allItems
      .map((t: any) => t.tracking_id ?? t.id)
      .filter((x: any): x is string => typeof x === 'string' && x.length > 0);

    // Lookup paralelo
    const [pmj, oab, banco] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from('processo_monitoramento_judit')
            .select('tracking_id, tenant_id, processo_id, monitoramento_ativo')
            .in('tracking_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from('processos_oab')
            .select('tracking_id, tenant_id, numero_cnj, monitoramento_ativo')
            .in('tracking_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabaseAdmin
            .from('tenant_banco_ids')
            .select('external_id, tenant_id, tipo, descricao')
            .in('external_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const byId = new Map<string, any>();
    for (const r of pmj.data ?? []) {
      byId.set(r.tracking_id, { ...byId.get(r.tracking_id), pmj: r });
    }
    for (const r of oab.data ?? []) {
      byId.set(r.tracking_id, { ...byId.get(r.tracking_id), oab: r });
    }
    for (const r of banco.data ?? []) {
      byId.set(r.external_id, { ...byId.get(r.external_id), banco: r });
    }

    // Resolver tenant_nome
    const tenantIds = new Set<string>();
    for (const v of byId.values()) {
      if (v.pmj?.tenant_id) tenantIds.add(v.pmj.tenant_id);
      if (v.oab?.tenant_id) tenantIds.add(v.oab.tenant_id);
      if (v.banco?.tenant_id) tenantIds.add(v.banco.tenant_id);
    }
    let tenantsMap = new Map<string, string>();
    if (tenantIds.size) {
      const { data: tdata } = await supabaseAdmin
        .from('tenants')
        .select('id, nome')
        .in('id', Array.from(tenantIds));
      tenantsMap = new Map((tdata ?? []).map((t: any) => [t.id, t.nome]));
    }

    const enriched = allItems.map((t: any) => {
      const trackingId = t.tracking_id ?? t.id;
      const local = byId.get(trackingId) ?? {};
      const tenantId =
        local.pmj?.tenant_id ?? local.oab?.tenant_id ?? local.banco?.tenant_id ?? null;
      const tipo = local.pmj
        ? 'CNJ'
        : local.oab
          ? 'OAB'
          : local.banco?.tipo === 'tracking_desativado'
            ? 'Desativado'
            : local.banco
              ? 'Banco'
              : 'Órfão';
      const reference =
        t.search?.search_key ??
        t.search_key ??
        local.oab?.numero_cnj ??
        t.reference ??
        null;
      return {
        tracking_id: trackingId,
        status: t.status ?? null,
        created_at: t.created_at ?? null,
        recurrence: t.recurrence ?? t.frequency ?? null,
        reference,
        tenant_id: tenantId,
        tenant_nome: tenantId ? (tenantsMap.get(tenantId) ?? null) : null,
        tipo,
        orfao: !local.pmj && !local.oab && !local.banco,
        raw: t,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: enriched.length,
        totalReported,
        items: enriched,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[judit-listar-trackings] erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});