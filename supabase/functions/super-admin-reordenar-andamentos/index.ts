import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const Body = z.object({
  processo_oab_id: z.string().uuid(),
  ordem: z.array(z.string().uuid()).min(1).max(2000),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'no_auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: sa } = await admin.from('super_admins').select('id').eq('user_id', userRes.user.id).maybeSingle();
    if (!sa) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { processo_oab_id, ordem } = parsed.data;

    // ordem do topo para o fim → topo recebe maior número
    const total = ordem.length;
    const updates = ordem.map((id, idx) => ({ id, ordem: total - idx }));
    let erro: string | null = null;
    for (const u of updates) {
      const { error } = await admin
        .from('processos_oab_andamentos')
        .update({ super_admin_ordem: u.ordem })
        .eq('id', u.id)
        .eq('processo_oab_id', processo_oab_id);
      if (error) { erro = error.message; break; }
    }
    if (erro) return new Response(JSON.stringify({ error: 'reorder_falhou', detail: erro }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});