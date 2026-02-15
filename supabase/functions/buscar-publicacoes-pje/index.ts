import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = 'https://ietjmyrelhijxyozcequ.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

const BATCH_SIZE = 5;

const TRIBUNAL_MAP: Record<string, string> = {
  'TJPR': 'tjpr', 'TJSP': 'tjsp', 'TJRJ': 'tjrj', 'TJMG': 'tjmg',
  'TJRS': 'tjrs', 'TJSC': 'tjsc', 'TJGO': 'tjgo', 'TJCE': 'tjce',
  'TJPE': 'tjpe', 'TJBA': 'tjba', 'TJDF': 'tjdft', 'TJMT': 'tjmt',
  'TJMS': 'tjms', 'TJPA': 'tjpa', 'TJAM': 'tjam', 'TJMA': 'tjma',
  'TJAL': 'tjal', 'TJSE': 'tjse', 'TJRN': 'tjrn', 'TJPB': 'tjpb',
  'TJPI': 'tjpi', 'TJES': 'tjes', 'TJRO': 'tjro', 'TJAC': 'tjac',
  'TJAP': 'tjap', 'TJRR': 'tjrr', 'TJTO': 'tjto',
  'TRT1': 'trt1', 'TRT2': 'trt2', 'TRT3': 'trt3', 'TRT4': 'trt4',
  'TRT5': 'trt5', 'TRT9': 'trt9', 'TRT12': 'trt12', 'TRT15': 'trt15',
  'TRF1': 'trf1', 'TRF2': 'trf2', 'TRF3': 'trf3', 'TRF4': 'trf4', 'TRF5': 'trf5',
};

// ===== PJe Comunicações HTML Parser =====
function parsePublicacoesPje(html: string, numeroProcesso: string, tribunal: string, tenantId: string): any[] {
  const publicacoes: any[] = [];

  // Pattern to capture intimações from comunica.pje.jus.br HTML
  const intimacaoRegex = /<strong>(\d+)\s*-\s*Intimação<\/strong>([\s\S]*?)(?=<strong>\d+\s*-|$)/gi;

  let match;
  while ((match = intimacaoRegex.exec(html)) !== null) {
    const sequencia = parseInt(match[1], 10);
    const blocoIntimacao = match[2];

    // Extract date
    const dataMatch = blocoIntimacao.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)
      || blocoIntimacao.match(/Data de disponibilização:\s*<\/strong>\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (!dataMatch) continue;

    const [dia, mes, ano] = dataMatch[1].split('/');
    const dataDisp = `${ano}-${mes}-${dia}`;

    // Extract órgão
    const orgaoMatch = blocoIntimacao.match(/Órgão:\s*<\/strong>\s*([^<\n]+)/i);
    const orgao = orgaoMatch ? orgaoMatch[1].trim() : null;

    // Extract tipo de comunicação
    const tipoMatch = blocoIntimacao.match(/Tipo de comunicação:\s*<\/strong>\s*([^<\n]+)/i);
    const tipoCom = tipoMatch ? tipoMatch[1].trim() : 'Intimação';

    // Extract partes
    const partesMatch = blocoIntimacao.match(/Parte\(s\):\s*<\/strong>([\s\S]*?)(?=<strong>|Advogado\(s\):)/i);
    let partes: string | null = null;
    if (partesMatch) {
      partes = partesMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000);
    }

    // Extract texto da intimação
    const textoMatch = blocoIntimacao.match(/Texto da intimação:\s*<\/strong>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    let textoIntimacao = '';
    if (textoMatch) {
      textoIntimacao = textoMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .trim();
    }

    // Build full content
    const fullTextStripped = blocoIntimacao
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const conteudo = textoIntimacao || fullTextStripped;

    // Determine tipo
    const tipo = tipoCom.toLowerCase().includes('citação') || tipoCom.toLowerCase().includes('citacao')
      ? 'Citação'
      : tipoCom.toLowerCase().includes('intimação') || tipoCom.toLowerCase().includes('intimacao')
        ? 'Intimação'
        : tipoCom;

    // Format CNJ number
    const numeroLimpo = numeroProcesso.replace(/\D/g, '');
    const cnj = numeroLimpo.length === 20
      ? `${numeroLimpo.slice(0,7)}-${numeroLimpo.slice(7,9)}.${numeroLimpo.slice(9,13)}.${numeroLimpo.slice(13,14)}.${numeroLimpo.slice(14,16)}.${numeroLimpo.slice(16,20)}`
      : numeroProcesso;

    publicacoes.push({
      tenant_id: tenantId,
      monitoramento_id: null,
      data_disponibilizacao: dataDisp,
      data_publicacao: dataDisp,
      tipo,
      numero_processo: cnj,
      diario_sigla: tribunal,
      diario_nome: `PJe Comunicações - ${tribunal}`,
      comarca: null,
      nome_pesquisado: null,
      conteudo_completo: conteudo.substring(0, 5000),
      link_acesso: `https://comunica.pje.jus.br`,
      status: 'nao_tratada',
      orgao,
      responsavel: null,
      partes,
    });
  }

  // Fallback: generic pattern if structured parsing found nothing
  if (publicacoes.length === 0) {
    const fallbackRegex = /Intimação referente ao movimento \(seq\. (\d+)\) ([^(]+)\((\d{2}\/\d{2}\/\d{4})\)/gi;
    let fMatch;
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      const descricao = fMatch[2].trim();
      const [dia, mes, ano] = fMatch[3].split('/');
      const dataDisp = `${ano}-${mes}-${dia}`;

      const numeroLimpo = numeroProcesso.replace(/\D/g, '');
      const cnj = numeroLimpo.length === 20
        ? `${numeroLimpo.slice(0,7)}-${numeroLimpo.slice(7,9)}.${numeroLimpo.slice(9,13)}.${numeroLimpo.slice(13,14)}.${numeroLimpo.slice(14,16)}.${numeroLimpo.slice(16,20)}`
        : numeroProcesso;

      publicacoes.push({
        tenant_id: tenantId,
        monitoramento_id: null,
        data_disponibilizacao: dataDisp,
        data_publicacao: dataDisp,
        tipo: 'Intimação',
        numero_processo: cnj,
        diario_sigla: tribunal,
        diario_nome: `PJe Comunicações - ${tribunal}`,
        comarca: null,
        nome_pesquisado: null,
        conteudo_completo: descricao.substring(0, 5000),
        link_acesso: `https://comunica.pje.jus.br`,
        status: 'nao_tratada',
        orgao: null,
        responsavel: null,
        partes: null,
      });
    }
  }

  return publicacoes;
}

// ===== PJe OAB parser (for OAB-based searches) =====
function parsePublicacoesPjeOab(html: string, tribunal: string, mon: any): any[] {
  const publicacoes: any[] = [];
  const nomePesquisado = mon.nome || `OAB ${mon.oab_numero || ''}/${mon.oab_uf || ''}`;

  // Pattern: each intimação block
  const intimacaoRegex = /<strong>(\d+)\s*-\s*(?:Intimação|Citação|Comunicação)<\/strong>([\s\S]*?)(?=<strong>\d+\s*-|$)/gi;

  let match;
  while ((match = intimacaoRegex.exec(html)) !== null) {
    const blocoIntimacao = match[2];

    // Extract date
    const dataMatch = blocoIntimacao.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)
      || blocoIntimacao.match(/Data de disponibilização:\s*<\/strong>\s*(\d{2}\/\d{2}\/\d{4})/i)
      || blocoIntimacao.match(/disponibilização:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (!dataMatch) continue;

    const [dia, mes, ano] = dataMatch[1].split('/');
    const dataDisp = `${ano}-${mes}-${dia}`;

    // Extract processo number
    const procMatch = blocoIntimacao.match(/Processo:\s*<\/strong>\s*([^<\n]+)/i)
      || blocoIntimacao.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    const numeroProcesso = procMatch ? procMatch[1].trim() : 'sem_numero';

    // Extract órgão
    const orgaoMatch = blocoIntimacao.match(/Órgão:\s*<\/strong>\s*([^<\n]+)/i);
    const orgao = orgaoMatch ? orgaoMatch[1].trim() : null;

    // Extract tipo
    const tipoMatch = blocoIntimacao.match(/Tipo de comunicação:\s*<\/strong>\s*([^<\n]+)/i);
    const tipoCom = tipoMatch ? tipoMatch[1].trim() : 'Intimação';
    const tipo = tipoCom.toLowerCase().includes('citação') || tipoCom.toLowerCase().includes('citacao')
      ? 'Citação' : 'Intimação';

    // Extract partes
    const partesMatch = blocoIntimacao.match(/Parte\(s\):\s*<\/strong>([\s\S]*?)(?=<strong>|Advogado\(s\):)/i);
    let partes: string | null = null;
    if (partesMatch) {
      partes = partesMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000);
    }

    // Extract texto
    const textoMatch = blocoIntimacao.match(/Texto da intimação:\s*<\/strong>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    let conteudo = '';
    if (textoMatch) {
      conteudo = textoMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (!conteudo) {
      conteudo = blocoIntimacao.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    publicacoes.push({
      tenant_id: mon.tenant_id,
      monitoramento_id: mon.id,
      data_disponibilizacao: dataDisp,
      data_publicacao: dataDisp,
      tipo,
      numero_processo: numeroProcesso,
      diario_sigla: tribunal,
      diario_nome: `PJe Comunicações - ${tribunal}`,
      comarca: null,
      nome_pesquisado: nomePesquisado,
      conteudo_completo: conteudo.substring(0, 5000),
      link_acesso: 'https://comunica.pje.jus.br',
      status: 'nao_tratada',
      orgao,
      responsavel: null,
      partes,
    });
  }

  // Fallback generic pattern
  if (publicacoes.length === 0) {
    const fallbackRegex = /Intimação referente ao movimento \(seq\. (\d+)\) ([^(]+)\((\d{2}\/\d{2}\/\d{4})\)/gi;
    let fMatch;
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      const [dia, mes, ano] = fMatch[3].split('/');
      const dataDisp = `${ano}-${mes}-${dia}`;
      publicacoes.push({
        tenant_id: mon.tenant_id,
        monitoramento_id: mon.id,
        data_disponibilizacao: dataDisp,
        data_publicacao: dataDisp,
        tipo: 'Intimação',
        numero_processo: 'sem_numero',
        diario_sigla: tribunal,
        diario_nome: `PJe Comunicações - ${tribunal}`,
        comarca: null,
        nome_pesquisado: nomePesquisado,
        conteudo_completo: fMatch[2].trim().substring(0, 5000),
        link_acesso: 'https://comunica.pje.jus.br',
        status: 'nao_tratada',
        orgao: null,
        responsavel: null,
        partes: null,
      });
    }
  }

  return publicacoes;
}

// ===== DataJud helpers (existing) =====
async function buscarViaDataJud(tribunal: string, numeroProcesso: string): Promise<any> {
  const tribunalCode = TRIBUNAL_MAP[tribunal.toUpperCase()] || tribunal.toLowerCase();
  const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunalCode}/_search`;
  const numeroFormatado = numeroProcesso.replace(/[.-]/g, '');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `APIKey ${DATAJUD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: numeroFormatado } },
      size: 10,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DataJud API ${response.status}: ${text.substring(0, 300)}`);
  }

  return await response.json();
}

function mapMovimentacoesToPublicacoes(hits: any[], sigla: string, mon: any, dataInicio: string): any[] {
  const pubs: any[] = [];
  const dataInicioDate = new Date(dataInicio);

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const numeroProcesso = source.numeroProcesso || '';
    const cnj = numeroProcesso.length === 20
      ? `${numeroProcesso.slice(0,7)}-${numeroProcesso.slice(7,9)}.${numeroProcesso.slice(9,13)}.${numeroProcesso.slice(13,14)}.${numeroProcesso.slice(14,16)}.${numeroProcesso.slice(16,20)}`
      : source.numero_cnj || numeroProcesso;

    const orgaoJulgador = source.orgaoJulgador?.nomeOrgao || null;
    const classeProcessual = source.classe?.nome || '';
    const assuntos = (source.assuntos || []).map((a: any) => a.nome).join(', ');
    const movimentacoes = source.movimentos || source.movimentacoes || [];

    for (const mov of movimentacoes) {
      const dataHora = mov.dataHora ? new Date(mov.dataHora) : null;
      if (!dataHora || dataHora < dataInicioDate) continue;

      const dataDisp = dataHora.toISOString().split('T')[0];
      const descricao = mov.complementoNacional?.nome || mov.nome || 'Movimentação';
      const complemento = mov.complementoNacional?.descricao || '';
      const tipo = descricao.toLowerCase().includes('intimação') ? 'Intimação'
        : descricao.toLowerCase().includes('citação') ? 'Citação'
        : descricao.toLowerCase().includes('sentença') ? 'Sentença'
        : descricao.toLowerCase().includes('despacho') ? 'Despacho'
        : descricao.toLowerCase().includes('decisão') ? 'Decisão'
        : 'Comunicação';

      const conteudo = [
        `Processo: ${cnj}`,
        `Classe: ${classeProcessual}`,
        assuntos ? `Assuntos: ${assuntos}` : '',
        `Órgão Julgador: ${orgaoJulgador || 'N/A'}`,
        `Movimentação: ${descricao}`,
        complemento ? `Complemento: ${complemento}` : '',
        `Data: ${dataDisp}`,
        `Código: ${mov.codigo || 'N/A'}`,
      ].filter(Boolean).join('\n');

      pubs.push({
        tenant_id: mon.tenant_id,
        monitoramento_id: mon.id,
        data_disponibilizacao: dataDisp,
        data_publicacao: dataDisp,
        tipo,
        numero_processo: cnj,
        diario_sigla: sigla,
        diario_nome: `DataJud - ${sigla}`,
        comarca: null,
        nome_pesquisado: mon.nome,
        conteudo_completo: conteudo.substring(0, 5000),
        link_acesso: `https://api-publica.datajud.cnj.jus.br`,
        status: 'nao_tratada',
        orgao: orgaoJulgador,
        responsavel: null,
        partes: null,
      });
    }
  }

  return pubs;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'manual';

    // ============================================================
    // === PJE_SCRAPER MODE: busca direta no comunica.pje.jus.br ===
    // ============================================================
    if (mode === 'pje_scraper') {
      const tenantId = body.tenant_id;
      if (!tenantId) {
        return new Response(JSON.stringify({ success: false, error: 'tenant_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify auth
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch processos_oab for this tenant
      const { data: processos, error: procError } = await supabaseAdmin
        .from('processos_oab')
        .select('numero_cnj, tribunal')
        .eq('tenant_id', tenantId)
        .not('numero_cnj', 'is', null)
        .not('tribunal', 'is', null);

      if (procError) throw new Error(`Error fetching processos: ${procError.message}`);

      if (!processos || processos.length === 0) {
        return new Response(JSON.stringify({
          success: true, inserted: 0, total_processos: 0,
          message: 'Nenhum processo encontrado para busca DJEN',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`pje_scraper: ${processos.length} processos para tenant ${tenantId}`);

      // Date range: last 30 days
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      let totalInserted = 0;
      let totalFound = 0;
      let totalErrors = 0;

      // Process in batches of 3 to avoid overwhelming the server
      for (let i = 0; i < processos.length; i += 3) {
        const batch = processos.slice(i, i + 3);

        const results = await Promise.allSettled(
          batch.map(async (proc: any) => {
            const tribunal = proc.tribunal?.toUpperCase() || '';
            const numeroCnj = proc.numero_cnj || '';
            const numeroLimpo = numeroCnj.replace(/\D/g, '');

            if (!numeroLimpo || !tribunal) return { found: 0, inserted: 0 };

            // Build URL for comunica.pje.jus.br
            const url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${tribunal}`
              + `&dataDisponibilizacaoInicio=${formatDate(dataInicio)}`
              + `&dataDisponibilizacaoFim=${formatDate(dataFim)}`
              + `&numeroProcesso=${numeroLimpo}`;

            console.log(`pje_scraper: fetching ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
              const response = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              if (!response.ok) {
                console.error(`pje_scraper: HTTP ${response.status} for ${numeroCnj}`);
                return { found: 0, inserted: 0 };
              }

              const html = await response.text();
              const pubs = parsePublicacoesPje(html, numeroCnj, tribunal, tenantId);

              if (pubs.length === 0) return { found: 0, inserted: 0 };

              // Upsert to avoid duplicates
              const { data: inserted, error: insertErr } = await supabaseAdmin
                .from('publicacoes')
                .upsert(pubs, {
                  onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
                  ignoreDuplicates: true,
                })
                .select('id');

              if (insertErr) {
                console.error(`pje_scraper: insert error for ${numeroCnj}:`, insertErr.message);
                return { found: pubs.length, inserted: 0 };
              }

              return { found: pubs.length, inserted: inserted?.length || 0 };
            } catch (err) {
              clearTimeout(timeoutId);
              console.error(`pje_scraper: error for ${numeroCnj}:`, err.message);
              return { found: 0, inserted: 0 };
            }
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            totalFound += r.value.found;
            totalInserted += r.value.inserted;
          } else {
            totalErrors++;
          }
        }

        // Small delay between batches
        if (i + 3 < processos.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      console.log(`pje_scraper done: found=${totalFound}, inserted=${totalInserted}, errors=${totalErrors}`);

      return new Response(JSON.stringify({
        success: true,
        total_processos: processos.length,
        total_found: totalFound,
        inserted: totalInserted,
        errors: totalErrors,
        source: 'pje_comunicacoes',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============================================================
    // === PJE_SCRAPER_OAB MODE: busca por OAB nos monitoramentos ===
    // ============================================================
    if (mode === 'pje_scraper_oab') {
      const tenantId = body.tenant_id;

      // Auth: either Bearer token or service_role_key (for cron)
      const authHeader = req.headers.get('Authorization');
      if (authHeader && !authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
        const { error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Fetch active monitoramentos (optionally filtered by tenant)
      let monQuery = supabaseAdmin
        .from('publicacoes_monitoramentos')
        .select('*')
        .eq('status', 'ativo');
      if (tenantId) monQuery = monQuery.eq('tenant_id', tenantId);

      const { data: monitoramentos, error: monError } = await monQuery;
      if (monError) throw new Error(`Error fetching monitoramentos: ${monError.message}`);
      if (!monitoramentos || monitoramentos.length === 0) {
        return new Response(JSON.stringify({
          success: true, inserted: 0, message: 'Nenhum monitoramento ativo encontrado',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`pje_scraper_oab: ${monitoramentos.length} monitoramentos ativos`);

      // Date range: last 5 days
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 5);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      let totalInserted = 0;
      let totalFound = 0;
      let totalErrors = 0;

      for (const mon of monitoramentos) {
        const nome = mon.nome || '';
        const oabNumero = mon.oab_numero || '';
        const oabUf = mon.oab_uf || '';
        const tribunais = mon.tribunais_monitorados as Record<string, string[]> | null;

        if (!nome && !oabNumero) {
          console.log(`pje_scraper_oab: skipping monitoramento ${mon.id} - no nome/oab`);
          continue;
        }

        // Collect all tribunal siglas from the monitoramento
        let allSiglas: string[] = [];
        if (tribunais) {
          allSiglas = Object.values(tribunais).flat();
        }

        if (allSiglas.length === 0) {
          console.log(`pje_scraper_oab: no tribunais for monitoramento ${mon.id}`);
          continue;
        }

        console.log(`pje_scraper_oab: monitoramento ${mon.id} (${nome}) - ${allSiglas.length} tribunais`);

        // Process tribunais in batches of 3
        for (let i = 0; i < allSiglas.length; i += 3) {
          const batch = allSiglas.slice(i, i + 3);

          const results = await Promise.allSettled(
            batch.map(async (sigla) => {
              // Build URL with name and/or OAB params
              let url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${sigla}`
                + `&dataDisponibilizacaoInicio=${formatDate(dataInicio)}`
                + `&dataDisponibilizacaoFim=${formatDate(dataFim)}`;

              if (nome) url += `&nomeAdvogado=${encodeURIComponent(nome)}`;
              if (oabNumero) url += `&oab=${oabNumero}`;
              if (oabUf) url += `&ufOab=${oabUf}`;

              console.log(`pje_scraper_oab: fetching ${url}`);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);

              try {
                const response = await fetch(url, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                  console.error(`pje_scraper_oab: HTTP ${response.status} for ${sigla}`);
                  return { found: 0, inserted: 0 };
                }

                const html = await response.text();
                // Reuse existing parser but adapt for OAB search (no specific process number)
                const pubs = parsePublicacoesPjeOab(html, sigla, mon);

                if (pubs.length === 0) return { found: 0, inserted: 0 };

                const { data: inserted, error: insertErr } = await supabaseAdmin
                  .from('publicacoes')
                  .upsert(pubs, {
                    onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
                    ignoreDuplicates: true,
                  })
                  .select('id');

                if (insertErr) {
                  console.error(`pje_scraper_oab: insert error for ${sigla}:`, insertErr.message);
                  return { found: pubs.length, inserted: 0 };
                }

                return { found: pubs.length, inserted: inserted?.length || 0 };
              } catch (err) {
                clearTimeout(timeoutId);
                console.error(`pje_scraper_oab: error for ${sigla}:`, err.message);
                return { found: 0, inserted: 0 };
              }
            })
          );

          for (const r of results) {
            if (r.status === 'fulfilled') {
              totalFound += r.value.found;
              totalInserted += r.value.inserted;
            } else {
              totalErrors++;
            }
          }

          // Delay between batches
          if (i + 3 < allSiglas.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      console.log(`pje_scraper_oab done: found=${totalFound}, inserted=${totalInserted}, errors=${totalErrors}`);

      return new Response(JSON.stringify({
        success: true,
        monitoramentos_processed: monitoramentos.length,
        total_found: totalFound,
        inserted: totalInserted,
        errors: totalErrors,
        source: 'pje_scraper_oab',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === API TEST MODE ===
    if (mode === 'api_test') {
      const tribunal = body.tribunal || 'TJPR';
      const numeroProcesso = body.numero_processo || '';
      if (!numeroProcesso) {
        return new Response(JSON.stringify({ success: false, error: 'numero_processo required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await buscarViaDataJud(tribunal, numeroProcesso);
      const hits = data.hits?.hits || [];
      return new Response(JSON.stringify({
        success: true, total_hits: data.hits?.total?.value || hits.length,
        hits_count: hits.length, raw_first_hit: hits[0]?._source || null,
        movimentacoes_count: hits[0]?._source?.movimentos?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === N8N TEST MODE ===
    if (mode === 'n8n_test') {
      const tribunal = body.tribunal || 'TJPR';
      const oabNumero = body.oab_numero;
      const oabUf = body.oab_uf;
      if (!oabNumero || !oabUf) {
        return new Response(JSON.stringify({ success: false, error: 'oab_numero and oab_uf are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const webhookPayload = {
        siglaTribunal: tribunal, numeroOab: oabNumero, ufOab: oabUf.toLowerCase(),
        dataInicio: body.data_inicio || ninetyDaysAgo, dataFim: body.data_fim || today,
      };
      const webhookRes = await fetch('https://voutibot.app.n8n.cloud/webhook/tjpr-scraper', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      const webhookData = await webhookRes.json();
      return new Response(JSON.stringify({
        success: true, webhook_status: webhookRes.status, webhook_response: webhookData,
        total_results: webhookData?.totalResults || webhookData?.data?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === N8N SCRAPER MODE ===
    if (mode === 'n8n_scraper') {
      const tribunal = body.tribunal || 'TJPR';
      const oabNumero = body.oab_numero;
      const oabUf = body.oab_uf;
      const tenantId = body.tenant_id;
      const monitoramentoId = body.monitoramento_id || null;

      if (!oabNumero || !oabUf || !tenantId) {
        return new Response(JSON.stringify({ success: false, error: 'oab_numero, oab_uf, and tenant_id are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const webhookPayload = {
        siglaTribunal: tribunal, numeroOab: oabNumero, ufOab: oabUf.toLowerCase(),
        dataInicio: body.data_inicio || ninetyDaysAgo, dataFim: body.data_fim || today,
      };

      const webhookRes = await fetch('https://voutibot.app.n8n.cloud/webhook/tjpr-scraper', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookRes.ok) {
        const errText = await webhookRes.text();
        throw new Error(`n8n webhook error ${webhookRes.status}: ${errText.substring(0, 300)}`);
      }

      const webhookData = await webhookRes.json();
      const items = webhookData?.data || [];

      if (items.length === 0) {
        return new Response(JSON.stringify({ success: true, inserted: 0, message: 'No publications found from n8n webhook' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let nomePesquisado = `OAB ${oabNumero}/${oabUf}`;
      if (monitoramentoId) {
        const { data: mon } = await supabaseAdmin
          .from('publicacoes_monitoramentos').select('nome').eq('id', monitoramentoId).single();
        if (mon?.nome) nomePesquisado = mon.nome;
      }

      const pubs = items.map((item: any) => {
        const descricao = item.descricao || '';
        const tipo = descricao.toLowerCase().includes('intimação') || descricao.toLowerCase().includes('intimacao') ? 'Intimação'
          : descricao.toLowerCase().includes('citação') || descricao.toLowerCase().includes('citacao') ? 'Citação'
          : descricao.toLowerCase().includes('sentença') || descricao.toLowerCase().includes('sentenca') ? 'Sentença'
          : descricao.toLowerCase().includes('despacho') ? 'Despacho'
          : descricao.toLowerCase().includes('decisão') || descricao.toLowerCase().includes('decisao') ? 'Decisão'
          : 'Comunicação';
        return {
          tenant_id: tenantId, monitoramento_id: monitoramentoId,
          data_disponibilizacao: item.dataPublicacao || today, data_publicacao: item.dataPublicacao || today,
          tipo, numero_processo: item.numeroProcesso || null,
          diario_sigla: item.tribunal || tribunal, diario_nome: `PJe Comunicações - ${item.tribunal || tribunal}`,
          comarca: null, nome_pesquisado: nomePesquisado,
          conteudo_completo: descricao.substring(0, 5000),
          link_acesso: 'https://comunica.pje.jus.br', status: 'nao_tratada',
          orgao: null, responsavel: null, partes: null,
        };
      });

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('publicacoes').upsert(pubs, {
          onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
          ignoreDuplicates: true,
        }).select('id');

      if (insertError) throw new Error(`Insert error: ${insertError.message}`);

      return new Response(JSON.stringify({
        success: true, inserted: inserted?.length || 0,
        total_from_webhook: items.length, source: 'n8n_scraper',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === SEED MODE ===
    if (mode === 'seed' && body.record) {
      const { data, error } = await supabaseAdmin.from('publicacoes').insert(body.record).select().single();
      if (error) throw new Error(`Seed insert error: ${error.message}`);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === MAIN MODE: buscar publicações via DataJud ===
    const monitoramentoId = body.monitoramento_id;

    let query = supabaseAdmin
      .from('publicacoes_monitoramentos').select('*').eq('status', 'ativo');
    if (monitoramentoId) query = query.eq('id', monitoramentoId);

    const { data: monitoramentos, error: mError } = await query;
    if (mError) throw new Error(`Error fetching monitoramentos: ${mError.message}`);
    if (!monitoramentos || monitoramentos.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active monitoramentos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${monitoramentos.length} monitoramentos via DataJud`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const mon of monitoramentos) {
      const tribunais = mon.tribunais_monitorados as Record<string, string[]>;
      if (!tribunais) continue;

      const allSiglas = Object.values(tribunais).flat();
      const today = new Date().toISOString().split('T')[0];
      const dataInicio = mon.data_inicio_monitoramento || today;

      const { data: processos } = await supabaseAdmin
        .from('processos_oab').select('numero_cnj, tribunal')
        .eq('tenant_id', mon.tenant_id).not('numero_cnj', 'is', null);

      const processosToSearch = processos || [];

      for (let i = 0; i < allSiglas.length; i += BATCH_SIZE) {
        const batch = allSiglas.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(async (sigla) => {
            try {
              const tribunalProcessos = processosToSearch.filter(
                (p: any) => p.tribunal?.toUpperCase() === sigla.toUpperCase()
              );
              if (tribunalProcessos.length === 0) return 0;

              let allPubs: any[] = [];
              for (const proc of tribunalProcessos) {
                try {
                  const data = await buscarViaDataJud(sigla, proc.numero_cnj);
                  const hits = data.hits?.hits || [];
                  allPubs = allPubs.concat(mapMovimentacoesToPublicacoes(hits, sigla, mon, dataInicio));
                } catch (err) {
                  console.error(`Error fetching ${proc.numero_cnj} from ${sigla}:`, err);
                }
              }

              if (allPubs.length === 0) return 0;

              const { data: inserted } = await supabaseAdmin
                .from('publicacoes').upsert(allPubs, {
                  onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
                  ignoreDuplicates: true,
                }).select('id');

              return inserted?.length || 0;
            } catch (err) {
              console.error(`Error processing ${sigla}:`, err);
              return 0;
            }
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') totalInserted += r.value;
          else totalErrors++;
        }

        if (i + BATCH_SIZE < allSiglas.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, inserted: totalInserted, errors: totalErrors,
      monitoramentos_processed: monitoramentos.length, source: 'datajud_api',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
