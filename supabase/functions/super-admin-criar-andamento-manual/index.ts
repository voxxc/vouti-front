import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'andamentos-manuais-docs';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

const BodySchema = z.object({
  processo_oab_id: z.string().uuid(),
  data_movimentacao: z.string().min(8), // YYYY-MM-DD ou ISO
  tipo_movimentacao: z.string().trim().min(1).max(120),
  descricao: z.string().trim().min(10).max(8000),
  marcar_nao_lido: z.boolean().optional().default(true),
  marcar_como_atualizado: z.boolean().optional().default(false),
  sigiloso: z.boolean().optional().default(false),
  tribunal_tag: z.string().trim().max(60).nullable().optional(),
  anexo: z
    .object({
      nome: z.string().min(1).max(255),
      content_type: z.string().min(1).max(120),
      base64: z.string().min(1), // sem prefixo data:
    })
    .nullable()
    .optional(),
});

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',').pop()! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function ensureBucket(admin: ReturnType<typeof createClient>) {
  const { data: list } = await admin.storage.listBuckets();
  if (list?.some((b) => b.name === BUCKET)) return;
  await admin.storage.createBucket(BUCKET, { public: false });
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

    // Identifica usuário a partir do JWT
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

    // Confirma super admin
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
    const body = parsed.data;

    // Carrega o processo (cross-tenant via service role)
    const { data: proc, error: procErr } = await admin
      .from('processos_oab')
      .select('id, tenant_id, numero_cnj')
      .eq('id', body.processo_oab_id)
      .maybeSingle();
    if (procErr || !proc) {
      return new Response(JSON.stringify({ error: 'processo_nao_encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const manualId = crypto.randomUUID();
    let anexoMeta: Record<string, unknown> | null = null;

    if (body.anexo) {
      const ext = (body.anexo.nome.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return new Response(JSON.stringify({ error: 'extensao_nao_permitida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const bytes = base64ToBytes(body.anexo.base64);
      if (bytes.byteLength > MAX_BYTES) {
        return new Response(JSON.stringify({ error: 'arquivo_muito_grande' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await ensureBucket(admin);

      const path = `${proc.tenant_id}/${proc.id}/${manualId}.${ext}`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: body.anexo.content_type,
        upsert: false,
      });
      if (upErr) {
        console.error('upload error', upErr);
        return new Response(JSON.stringify({ error: 'upload_falhou', detail: upErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      anexoMeta = {
        bucket: BUCKET,
        storage_path: path,
        nome: body.anexo.nome,
        content_type: body.anexo.content_type,
        size: bytes.byteLength,
      };
    }

    // Normaliza data
    let dataMov = body.data_movimentacao;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataMov)) dataMov = `${dataMov}T12:00:00Z`;

    const dadosCompletos = {
      id: manualId,
      origem: 'manual',
      criado_por_super_admin: true,
      super_admin_user_id: user.id,
      super_admin_email: user.email,
      criado_em: new Date().toISOString(),
      anexo: anexoMeta,
      sigiloso: !!body.sigiloso,
      tribunal_tag: body.tribunal_tag || null,
    };

    // calcula próxima posição se já existir reordenação manual no processo
    const { data: maxRow } = await admin
      .from('processos_oab_andamentos')
      .select('super_admin_ordem')
      .eq('processo_oab_id', proc.id)
      .order('super_admin_ordem', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const proximaOrdem = (maxRow?.super_admin_ordem ?? 0) + 1;
    const usaOrdem = !!maxRow?.super_admin_ordem;

    const { data: andamento, error: insErr } = await admin
      .from('processos_oab_andamentos')
      .insert({
        processo_oab_id: proc.id,
        tenant_id: proc.tenant_id,
        data_movimentacao: dataMov,
        tipo_movimentacao: body.tipo_movimentacao,
        descricao: body.descricao,
        lida: !body.marcar_nao_lido,
        dados_completos: dadosCompletos,
        super_admin_ordem: usaOrdem ? proximaOrdem : null,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('insert error', insErr);
      return new Response(JSON.stringify({ error: 'insert_falhou', detail: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Marca o processo como "atualizado" (janela de 7 dias) quando solicitado
    if (body.marcar_como_atualizado) {
      const { error: updErr } = await admin
        .from('processos_oab')
        .update({
          super_admin_atualizado_em: new Date().toISOString(),
          super_admin_atualizado_por: user.id,
        })
        .eq('id', proc.id);
      if (updErr) {
        console.error('marcar_como_atualizado error', updErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, andamento_id: andamento.id, anexo: anexoMeta }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('fatal', e);
    return new Response(JSON.stringify({ error: 'internal', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});