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

// --- Extração de texto dos anexos ---
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    // @ts-ignore
    const pdfjs: any = await import('https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false }).promise;
    let out = '';
    const pages = Math.min(doc.numPages, 20);
    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((i: any) => i.str).join(' ') + '\n\n';
      if (out.length > 50000) break;
    }
    return out.trim();
  } catch (e: any) {
    console.warn('[test-publicacao-cnj] falha extrair PDF:', e?.message);
    return '';
  }
}

async function extractAttachmentText(buffer: ArrayBuffer, extension: string, contentType: string): Promise<string> {
  const ext = extension.toLowerCase();
  if (ext === 'pdf' || contentType.includes('pdf')) {
    return await extractPdfText(buffer);
  }
  if (ext === 'html' || ext === 'htm' || contentType.includes('html')) {
    try {
      return htmlToText(new TextDecoder('utf-8').decode(buffer)).slice(0, 50000);
    } catch {
      return '';
    }
  }
  return '';
}

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
  const attachmentsTop: any[] = Array.isArray(responseData.attachments)
    ? responseData.attachments
    : [];
  const cnjResolvido = (numeroCnj && numeroCnj.length > 0)
    ? numeroCnj
    : String(responseData.code || responseData.numero_processo || '').trim();
  if (!cnjResolvido) {
    throw new Error('Não foi possível determinar o CNJ a partir do response');
  }

  // Lookup step por step_id (Judit envia attachments no nível top-level)
  const stepById = new Map<string, any>();
  for (const s of steps) {
    if (s.step_id) stepById.set(String(s.step_id), s);
  }

  // Junta: attachments top-level OU dentro de cada step (fallback)
  const allAttachments: Array<{ att: any; step: any }> = [];
  for (const att of attachmentsTop) {
    const stepRef = att.step_id ? stepById.get(String(att.step_id)) : null;
    allAttachments.push({ att, step: stepRef || {} });
  }
  for (const s of steps) {
    if (Array.isArray(s.attachments)) {
      for (const att of s.attachments) allAttachments.push({ att, step: s });
    }
  }

  // Filtra válidos e ordena por attachment_date desc
  const validAttachments = allAttachments
    .filter(({ att }) => {
      const status = String(att.status || '').toLowerCase();
      const corrupted = att.corrupted === true;
      if (corrupted) return false;
      if (status && status !== 'done' && status !== 'completed') return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.att.attachment_date || a.step.step_date || 0).getTime();
      const db = new Date(b.att.attachment_date || b.step.step_date || 0).getTime();
      return db - da;
    })
    .slice(0, 10);

  console.log(
    `[test-publicacao-cnj] steps=${steps.length} attachments_top=${attachmentsTop.length} validos=${validAttachments.length}`,
  );

  if (validAttachments.length === 0) {
    throw new Error(
      `Nenhum anexo válido (top=${attachmentsTop.length}, steps=${steps.length})`,
    );
  }

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

  for (const { att, step } of validAttachments) {
    const attachmentId = att.attachment_id || att.id;
    const attachmentName =
      att.attachment_name || att.name || att.nome || `${attachmentId}.pdf`;
    const extension = String(att.extension || attachmentName.split('.').pop() || 'pdf').toLowerCase();
    if (!attachmentId) continue;

    try {
      const downloadUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpoDigits}/${instancia}/attachments/${attachmentId}`;
      const fileResp = await fetch(downloadUrl, { headers: { 'api-key': juditApiKey } });
      if (!fileResp.ok) {
        errors.push(`${attachmentName}: download ${fileResp.status}`);
        continue;
      }
      const arrayBuffer = await fileResp.arrayBuffer();
      const contentType =
        fileResp.headers.get('content-type') ||
        (extension === 'pdf' ? 'application/pdf' : extension === 'html' ? 'text/html' : 'application/octet-stream');
      const storagePath = `${DEMORAIS_TENANT_ID}/_teste_publicacao/${attachmentId}.${extension}`;

      const { error: upErr } = await supabase.storage
        .from('processo-documentos')
        .upload(storagePath, new Uint8Array(arrayBuffer), { contentType, upsert: true });
      if (upErr) {
        errors.push(`${attachmentName}: storage ${upErr.message}`);
        continue;
      }

      const stepText = String(step.content || step.description || attachmentName).toLowerCase();
      const ehDecisao = DECISAO_KEYWORDS.some((k) => stepText.includes(k));
      const dataStep =
        att.attachment_date || step.step_date || step.data || new Date().toISOString();
      const dataDisp = String(dataStep).slice(0, 10);

      const { data: pub, error: pubErr } = await supabase
          .from('publicacoes')
          .insert({
            tenant_id: DEMORAIS_TENANT_ID,
            origem: 'monitoramento_processo',
            tipo: ehDecisao ? 'Decisão' : 'Publicação',
            numero_processo: cnjResolvido,
            data_disponibilizacao: dataDisp,
            conteudo_completo: (
              (await extractAttachmentText(arrayBuffer, extension, contentType)) ||
              String(step.content || step.description || '')
            ).slice(0, 50000),
            storage_path: storagePath,
            processo_oab_id: processo?.id || null,
            status: 'nao_tratada',
            nome_pesquisado: attachmentName,
            diario_sigla: 'JUDIT',
            diario_nome: 'Monitoramento Judit',
            metadata: {
              teste: true,
              attachment_id: attachmentId,
              attachment_name: attachmentName,
              extension,
              size: arrayBuffer.byteLength,
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
