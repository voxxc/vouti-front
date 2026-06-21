import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  processo_oab_id: z.string().uuid(),
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: sa } = await admin
      .from('super_admins')
      .select('id')
      .eq('user_id', userRes.user.id)
      .maybeSingle();
    if (!sa) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { processo_oab_id } = parsed.data;

    const { data: processo, error: pErr } = await admin
      .from('processos_oab')
      .select('*')
      .eq('id', processo_oab_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!processo) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [andRes, anxRes, monRes] = await Promise.all([
      admin
        .from('processos_oab_andamentos')
        .select('id, data_movimentacao, tipo_movimentacao, descricao, dados_completos, lida, created_at')
        .eq('processo_oab_id', processo_oab_id)
        .order('data_movimentacao', { ascending: false })
        .limit(500),
      admin
        .from('processos_oab_anexos')
        .select('id, attachment_id, attachment_name, extension, status, content_description, step_id, created_at')
        .eq('processo_oab_id', processo_oab_id)
        .order('created_at', { ascending: false })
        .limit(200),
      admin
        .from('processo_oab_monitoramento_escavador')
        .select('monitoramento_ativo, frequencia, ultima_consulta, ultima_atualizacao, total_atualizacoes, monitoramento_id')
        .eq('processo_oab_id', processo_oab_id)
        .maybeSingle(),
    ]);

    if (andRes.error) throw andRes.error;
    if (anxRes.error) throw anxRes.error;

    return new Response(
      JSON.stringify({
        processo,
        andamentos: andRes.data || [],
        anexos: anxRes.data || [],
        monitoramento_escavador: monRes.data || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    console.error('[super-admin-processo-oab-detalhes]', e);
    return new Response(
      JSON.stringify({ error: 'internal', message: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});