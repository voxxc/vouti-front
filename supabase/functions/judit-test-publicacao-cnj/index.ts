import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUDIT_API_URL = 'https://requests.prod.judit.io';
const DEMORAIS_TENANT_ID = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750';

const DECISAO_KEYWORDS = [
  'sentenç', 'defiro', 'indefiro', 'liminar', 'tutela', 'decisão',
  'decisao', 'despacho', 'julgo procedente', 'julgo improcedente',
  'homologo', 'acórdão', 'acordao'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authorization header missing' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');
    if (!juditApiKey) return json({ error: 'JUDIT_API_KEY ausente' }, 500);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return json({ error: 'Token inválido' }, 401);

    const { data: sa } = await supabaseAdmin
      .from('super_admins').select('id').eq('user_id', user.id).maybeSingle();
    if (!sa) return json({ error: 'Acesso negado: apenas Super-Admins' }, 403);

    const body = await req.json().catch(() => ({}));
    const numeroCnj = String(body?.numero_cnj || body?.numeroCnj || '').trim();
    if (!numeroCnj) return json({ error: 'numero_cnj é obrigatório' }, 400);

    const numeroLimpo = numeroCnj.replace(/[^\d.-]/g, '');

    // Cria job pendente
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('publicacao_test_jobs')
      .insert({
        tenant_id: DEMORAIS_TENANT_ID,
        numero_cnj: numeroLimpo,
        status: 'pending',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (jobErr || !job) {
      return json({ error: 'Falha ao criar job', details: jobErr?.message }, 500);
    }

    // Dispara processamento em background
    // @ts-ignore - EdgeRuntime existe no Deno deploy
    EdgeRuntime.waitUntil(
      processarJob(supabaseAdmin, juditApiKey, job.id, numeroLimpo).catch(async (err) => {
        console.error('[test-publicacao-cnj] background error', err);
        await supabaseAdmin
          .from('publicacao_test_jobs')
          .update({ status: 'failed', error_message: String(err?.message || err) })
          .eq('id', job.id);
      })
    );

    return json({ jobId: job.id, status: 'pending' }, 202);
  } catch (e: any) {
    console.error('[test-publicacao-cnj] erro', e);
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processarJob(
  supabase: any,
  juditApiKey: string,
  jobId: string,
  numeroCnj: string,
) {
  await supabase.from('publicacao_test_jobs')
    .update({ status: 'processing' }).eq('id', jobId);

  // 1. Cria request com attachments
  const reqResp = await fetch(`${JUDIT_API_URL}/requests`, {
    method: 'POST',
    headers: { 'api-key': juditApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search: { search_type: 'lawsuit_cnj', search_key: numeroCnj, on_demand: true },
      with_attachments: true,
    }),
  });

  if (!reqResp.ok) {
    const text = await reqResp.text();
    throw new Error(`Judit POST /requests ${reqResp.status}: ${text}`);
  }
  const { request_id } = await reqResp.json();
  if (!request_id) throw new Error('request_id não retornado pela Judit');

  // 2. Polling do response (até ~90s)
  let responseData: any = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`${JUDIT_API_URL}/responses?request_id=${request_id}`, {
      headers: { 'api-key': juditApiKey },
    });
    if (!r.ok) continue;
    const data = await r.json();
    const items = data.page_data || data.items || (Array.isArray(data) ? data : []);
    const first = Array.isArray(items) ? items[0] : data;
    const status = first?.status || data?.status;
    if (status === 'completed' || status === 'done') {
      responseData = first?.response_data || first || data;
      break;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`Judit retornou status ${status}`);
    }
  }

  if (!responseData) throw new Error('Timeout aguardando resposta Judit');

  // 3. Localiza último step com anexo
  const steps: any[] = responseData.steps || responseData.movimentacoes || [];
  const sortedSteps = [...steps].sort((a, b) => {
    const da = new Date(a.step_date || a.data || 0).getTime();
    const db = new Date(b.step_date || b.data || 0).getTime();
    return db - da;
  });

  const stepComAnexo = sortedSteps.find(
    (s) => Array.isArray(s.attachments) && s.attachments.length > 0,
  );

  if (!stepComAnexo) {
    throw new Error('Nenhum andamento com anexo encontrado para este CNJ');
  }

  const attachment = stepComAnexo.attachments[stepComAnexo.attachments.length - 1];
  const attachmentId = attachment.attachment_id || attachment.id;
  const attachmentName = attachment.name || attachment.nome || `${attachmentId}.pdf`;
  if (!attachmentId) throw new Error('attachment_id ausente');

  // 4. Baixa o binário
  const numeroLimpoDigits = numeroCnj.replace(/\D/g, '');
  const instancia = responseData.instance || responseData.instancia || 1;
  const downloadUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpoDigits}/${instancia}/attachments/${attachmentId}`;

  const fileResp = await fetch(downloadUrl, { headers: { 'api-key': juditApiKey } });
  if (!fileResp.ok) {
    throw new Error(`Falha ao baixar anexo (${fileResp.status})`);
  }
  const arrayBuffer = await fileResp.arrayBuffer();
  const contentType = fileResp.headers.get('content-type') || 'application/pdf';

  // 5. Upload no bucket
  const ext = attachmentName.split('.').pop() || 'pdf';
  const storagePath = `${DEMORAIS_TENANT_ID}/_teste_publicacao/${attachmentId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('processo-documentos')
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType,
      upsert: true,
    });
  if (upErr) throw new Error(`Storage: ${upErr.message}`);

  // 6. Vincula a um processos_oab existente, se houver
  const { data: processo } = await supabase
    .from('processos_oab')
    .select('id')
    .eq('tenant_id', DEMORAIS_TENANT_ID)
    .eq('numero_processo', numeroCnj)
    .maybeSingle();

  // 7. Determina tipo (decisão se contiver keyword)
  const stepText = String(stepComAnexo.content || stepComAnexo.description || '').toLowerCase();
  const ehDecisao = DECISAO_KEYWORDS.some((k) => stepText.includes(k));

  const dataStep = stepComAnexo.step_date || stepComAnexo.data || new Date().toISOString();
  const dataDisp = String(dataStep).slice(0, 10);

  // 8. Insere publicação
  const { data: pub, error: pubErr } = await supabase
    .from('publicacoes')
    .insert({
      tenant_id: DEMORAIS_TENANT_ID,
      origem: 'monitoramento_processo',
      tipo: ehDecisao ? 'Decisão (teste)' : 'Publicação (teste)',
      numero_processo: numeroCnj,
      data_disponibilizacao: dataDisp,
      conteudo_completo: String(stepComAnexo.content || stepComAnexo.description || '').slice(0, 50000),
      storage_path: storagePath,
      processo_oab_id: processo?.id || null,
      status: 'nao_lida',
      metadata: {
        teste: true,
        attachment_id: attachmentId,
        attachment_name: attachmentName,
        request_id,
      },
    })
    .select('id')
    .single();

  if (pubErr) throw new Error(`Insert publicacao: ${pubErr.message}`);

  await supabase.from('publicacao_test_jobs').update({
    status: 'completed',
    publicacao_id: pub.id,
    storage_path: storagePath,
    attachment_name: attachmentName,
  }).eq('id', jobId);
}
