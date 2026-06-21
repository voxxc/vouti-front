import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('criar'), slug: z.string().trim().min(1).max(60), nome: z.string().trim().min(1).max(80), cor: z.string().trim().max(20).optional().nullable() }),
  z.object({ action: z.literal('editar'), id: z.string().uuid(), nome: z.string().trim().min(1).max(80).optional(), cor: z.string().trim().max(20).optional().nullable() }),
  z.object({ action: z.literal('excluir'), id: z.string().uuid() }),
]);

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

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
    if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const b = parsed.data;

    if (b.action === 'criar') {
      const slug = slugify(b.slug);
      const { data, error } = await admin.from('super_admin_tribunais_andamento').insert({ slug, nome: b.nome, cor: b.cor || null, created_by: userRes.user.id }).select('id, slug, nome, cor').single();
      if (error) return new Response(JSON.stringify({ error: 'insert_falhou', detail: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true, tribunal: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (b.action === 'editar') {
      const patch: Record<string, unknown> = {};
      if (b.nome !== undefined) patch.nome = b.nome;
      if (b.cor !== undefined) patch.cor = b.cor;
      const { data, error } = await admin.from('super_admin_tribunais_andamento').update(patch).eq('id', b.id).select('id, slug, nome, cor').single();
      if (error) return new Response(JSON.stringify({ error: 'update_falhou', detail: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true, tribunal: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // excluir
    const { error } = await admin.from('super_admin_tribunais_andamento').delete().eq('id', b.id);
    if (error) return new Response(JSON.stringify({ error: 'delete_falhou', detail: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});