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
    const requestIdInput = String(body?.request_id || body?.requestId || '').trim();
    if (!numeroCnj && !requestIdInput) {
      return json({ error: 'Informe numero_cnj ou request_id' }, 400);
    }

    const numeroLimpo = numeroCnj.replace(/[^\d.-]/g, '');

    // Cria job pendente
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('publicacao_test_jobs')
      .insert({
        tenant_id: DEMORAIS_TENANT_ID,
        numero_cnj: numeroLimpo || '(via request_id)',
        request_id: requestIdInput || null,
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
      processarJob(supabaseAdmin, juditApiKey, job.id, numeroLimpo, requestIdInput).catch(async (err) => {
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
  reuseRequestId?: string,
) {
  await supabase.from('publicacao_test_jobs')
    .update({ status: 'processing' }).eq('id', jobId);

  // 1. Obter request_id (reaproveitando ou criando)
  let request_id: string;
  if (reuseRequestId) {
    request_id = reuseRequestId;
    console.log('[test-publicacao-cnj] reusando request_id', request_id);
  } else {
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
    const parsed = await reqResp.json();
    request_id = parsed.request_id;
    if (!request_id) throw new Error('request_id não retornado pela Judit');
  }

  // 2. Polling do response (até ~5 min: 60 × 5s)
  let responseData: any = null;
  let lastStatus: string | null = null;
  let lastShape: string | null = null;
  const maxAttempts = reuseRequestId ? 30 : 60;
  for (let i = 0; i < maxAttempts; i++) {
    // Para request_id reaproveitado, pode já estar pronto — começa rápido
    if (i > 0 || !reuseRequestId) {
      await new Promise((r) => setTimeout(r, reuseRequestId ? 2000 : 5000));
    }
    const r = await fetch(`${JUDIT_API_URL}/responses?request_id=${request_id}`, {
      headers: { 'api-key': juditApiKey },
    });
    if (!r.ok) {
      lastStatus = `http_${r.status}`;
      continue;
    }
    const data = await r.json();
    const items = data.page_data || data.items || (Array.isArray(data) ? data : []);
    const first = Array.isArray(items) ? items[0] : data;
    const status = first?.status || data?.status || null;
    lastStatus = status;
    if (i === 0) {
      lastShape = JSON.stringify({
        keys_top: Object.keys(data || {}),
        items_len: Array.isArray(items) ? items.length : null,
        first_keys: first ? Object.keys(first) : null,
        first_status: status,
      });
      console.log('[test-publicacao-cnj] primeira resposta', lastShape);
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`Judit retornou status ${status}`);
    }
    // Considera pronto se vier response_data com steps/code, OU se status indicar conclusão
    const candidate = first?.response_data || first || data;
    const hasData =
      candidate && (Array.isArray(candidate.steps) || candidate.code || candidate.numero_processo);
    if (status === 'completed' || status === 'done' || hasData) {
      responseData = candidate;
      break;
    }
  }

  if (!responseData) {
    throw new Error(
      `Timeout aguardando resposta Judit (últ. status: ${lastStatus ?? 'nenhum'})`,
    );
  }

  // 3. Localiza TODOS os steps com anexo
  const steps: any[] = responseData.steps || responseData.movimentacoes || [];
  const cnjResolvido = (numeroCnj && numeroCnj.length > 0)
    ? numeroCnj
    : String(responseData.code || responseData.numero_processo || '').trim();
  if (!cnjResolvido) {
    throw new Error('Não foi possível determinar o CNJ a partir do response');
  }

  const sortedSteps = [...steps].sort((a, b) => {
    const da = new Date(a.step_date || a.data || 0).getTime();
    const db = new Date(b.step_date || b.data || 0).getTime();
    return db - da;
  });

  const stepsComAnexo = sortedSteps.filter(
    (s) => Array.isArray(s.attachments) && s.attachments.length > 0,
  ).slice(0, 10); // limite de segurança

  if (stepsComAnexo.length === 0) {
    throw new Error('Nenhum andamento com anexo encontrado para este CNJ');
  }

  console.log(`[test-publicacao-cnj] ${stepsComAnexo.length} step(s) com anexo`);

  // Vincula a um processos_oab existente, se houver
  const { data: processo } = await supabase
    .from('processos_oab')
    .select('id')
    .eq('tenant_id', DEMORAIS_TENANT_ID)
    .eq('numero_processo', cnjResolvido)
    .maybeSingle();

  const numeroLimpoDigits = cnjResolvido.replace(/\D/g, '');
  const instancia = responseData.instance || responseData.instancia || 1;

  let firstStoragePath: string | null = null;
  let firstAttachmentName: string | null = null;
  let firstPubId: string | null = null;
  let countOk = 0;
  const errors: string[] = [];

  for (const step of stepsComAnexo) {
    for (const att of step.attachments) {
      const attachmentId = att.attachment_id || att.id;
      const attachmentName = att.name || att.nome || `${attachmentId}.pdf`;
      if (!attachmentId) continue;

      try {
        const downloadUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpoDigits}/${instancia}/attachments/${attachmentId}`;
        const fileResp = await fetch(downloadUrl, { headers: { 'api-key': juditApiKey } });
        if (!fileResp.ok) {
          errors.push(`${attachmentName}: download ${fileResp.status}`);
          continue;
        }
        const arrayBuffer = await fileResp.arrayBuffer();
        const contentType = fileResp.headers.get('content-type') || 'application/pdf';
        const ext = attachmentName.split('.').pop() || 'pdf';
        const storagePath = `${DEMORAIS_TENANT_ID}/_teste_publicacao/${attachmentId}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('processo-documentos')
          .upload(storagePath, new Uint8Array(arrayBuffer), { contentType, upsert: true });
        if (upErr) {
          errors.push(`${attachmentName}: storage ${upErr.message}`);
          continue;
        }

        const stepText = String(step.content || step.description || '').toLowerCase();
        const ehDecisao = DECISAO_KEYWORDS.some((k) => stepText.includes(k));
        const dataStep = step.step_date || step.data || new Date().toISOString();
        const dataDisp = String(dataStep).slice(0, 10);

        const { data: pub, error: pubErr } = await supabase
          .from('publicacoes')
          .insert({
            tenant_id: DEMORAIS_TENANT_ID,
            origem: 'monitoramento_processo',
            tipo: ehDecisao ? 'Decisão (teste)' : 'Publicação (teste)',
            numero_processo: cnjResolvido,
            data_disponibilizacao: dataDisp,
            conteudo_completo: String(step.content || step.description || '').slice(0, 50000),
            storage_path: storagePath,
            processo_oab_id: processo?.id || null,
            status: 'nao_lida',
            metadata: {
              teste: true,
              attachment_id: attachmentId,
              attachment_name: attachmentName,
              request_id,
              reused_request: !!reuseRequestId,
            },
          })
          .select('id')
          .single();
        if (pubErr) {
          errors.push(`${attachmentName}: insert ${pubErr.message}`);
          continue;
        }

        countOk += 1;
        if (!firstStoragePath) {
          firstStoragePath = storagePath;
          firstAttachmentName = attachmentName;
          firstPubId = pub.id;
        }
      } catch (err: any) {
        errors.push(`${attachmentName}: ${err.message}`);
      }
    }
  }

  if (countOk === 0) {
    throw new Error(`Nenhuma publicação criada. ${errors.slice(0, 3).join(' | ')}`);
  }

  await supabase.from('publicacao_test_jobs').update({
    status: 'completed',
    publicacao_id: firstPubId,
    storage_path: firstStoragePath,
    attachment_name: countOk > 1 ? `${countOk} anexos (1º: ${firstAttachmentName})` : firstAttachmentName,
    error_message: errors.length > 0 ? `Parcial: ${errors.length} falha(s)` : null,
  }).eq('id', jobId);
}
