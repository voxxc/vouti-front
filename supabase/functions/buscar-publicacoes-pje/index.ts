import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = 'https://ietjmyrelhijxyozcequ.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

const BATCH_SIZE = 5;
const N8N_WEBHOOK_URL = 'https://voutibot.app.n8n.cloud/webhook/tjpr-scraper';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';
const FIRECRAWL_TIMEOUT_MS = 45000;

// ===== CNJ Comunica API (oficial) =====
const CNJ_API_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacoes';
const CNJ_API_TIMEOUT_MS = 20000;
const CNJ_API_MAX_PAGES = 50; // safety cap = 5000 itens / tribunal
const CNJ_API_PAGE_SIZE = 100;

/**
 * Busca comunicações na API oficial do CNJ (PJe Comunica), com paginação.
 * Retorna array de itens brutos (sem parsing). Faz retry 1x em 5xx/network.
 */
async function fetchComunicacoesViaApiOficial(params: {
  sigla: string;
  oabNumero: string;
  oabUf: string;
  dataInicio: string;
  dataFim: string;
}): Promise<{ items: any[]; pages: number }> {
  const allItems: any[] = [];
  let pagina = 1;

  const fetchPage = async (pageNum: number): Promise<any> => {
    const url =
      `${CNJ_API_BASE}?siglaTribunal=${encodeURIComponent(params.sigla)}` +
      `&numeroOab=${encodeURIComponent(params.oabNumero)}` +
      `&ufOab=${encodeURIComponent(params.oabUf.toLowerCase())}` +
      `&dataDisponibilizacaoInicio=${params.dataInicio}` +
      `&dataDisponibilizacaoFim=${params.dataFim}` +
      `&itensPorPagina=${CNJ_API_PAGE_SIZE}` +
      `&pagina=${pageNum}`;

    const tryOnce = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CNJ_API_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          },
          signal: controller.signal,
        });
        return res;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let res: Response;
    try {
      res = await tryOnce();
      if (res.status >= 500) throw new Error(`CNJ API ${res.status}`);
    } catch (err) {
      // Retry uma única vez em erro de rede / 5xx
      console.warn(`cnj_api: retry page ${pageNum} after error:`, (err as Error).message);
      res = await tryOnce();
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`CNJ API ${res.status}: ${text.substring(0, 200)}`);
    }
    return await res.json();
  };

  while (pagina <= CNJ_API_MAX_PAGES) {
    const data = await fetchPage(pagina);

    // Estrutura da resposta pode variar: { items }, { comunicacoes }, array direto, etc.
    let pageItems: any[] = [];
    if (Array.isArray(data)) pageItems = data;
    else if (Array.isArray(data?.items)) pageItems = data.items;
    else if (Array.isArray(data?.comunicacoes)) pageItems = data.comunicacoes;
    else if (Array.isArray(data?.content)) pageItems = data.content;
    else {
      for (const key of Object.keys(data || {})) {
        if (Array.isArray(data[key])) { pageItems = data[key]; break; }
      }
    }

    if (pageItems.length === 0) break;
    allItems.push(...pageItems);

    // Se a página veio incompleta, é a última.
    if (pageItems.length < CNJ_API_PAGE_SIZE) break;

    pagina++;
  }

  return { items: allItems, pages: pagina };
}

// ===== Firecrawl scraper for DJEN (PJe Comunicações) =====
// Scrapes a single DJEN page via Firecrawl. SPA pesada → waitFor longo + actions.
async function scrapeDjenPageViaFirecrawl(params: {
  sigla: string;
  oabNumero: string;
  oabUf: string;
  dataInicio: string;
  dataFim: string;
  pagina: number;
}): Promise<{ html: string; markdown: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured. Connect Firecrawl in project settings.');
  }

  const url =
    `https://comunica.pje.jus.br/consulta?siglaTribunal=${encodeURIComponent(params.sigla)}` +
    `&dataDisponibilizacaoInicio=${params.dataInicio}` +
    `&dataDisponibilizacaoFim=${params.dataFim}` +
    `&numeroOab=${encodeURIComponent(params.oabNumero)}` +
    `&ufOab=${encodeURIComponent(params.oabUf.toLowerCase())}` +
    `&pagina=${params.pagina}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);

  try {
    const res = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 8000,
        actions: [{ type: 'wait', milliseconds: 5000 }],
        location: { country: 'BR', languages: ['pt-BR'] },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(`Firecrawl ${res.status}: ${errMsg}`);
    }

    const payload = data?.data || data;
    const html = payload?.html || payload?.rawHtml || '';
    const markdown = payload?.markdown || '';
    return { html, markdown };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Firecrawl timeout');
    throw err;
  }
}

// Multi-page scrape: itera páginas até esgotar (markdown sem novos itens) ou bater 30 páginas.
async function scrapeDjenViaFirecrawl(params: {
  sigla: string;
  oabNumero: string;
  oabUf: string;
  dataInicio: string;
  dataFim: string;
}): Promise<{ html: string; markdown: string; pages: number }> {
  const MAX_PAGES = 30;
  const htmlParts: string[] = [];
  const mdParts: string[] = [];
  let pagesFetched = 0;
  let lastSignature = '';

  for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
    let pageData: { html: string; markdown: string };
    try {
      pageData = await scrapeDjenPageViaFirecrawl({ ...params, pagina });
    } catch (err: any) {
      if (pagina === 1) throw err; // primeira página falhar = falha geral
      console.warn(`firecrawl: page ${pagina} failed for ${params.sigla}: ${err.message} — parando paginação`);
      break;
    }
    pagesFetched = pagina;

    const html = pageData.html || '';
    const markdown = pageData.markdown || '';

    if (!html && !markdown) {
      if (pagina === 1) throw new Error('Firecrawl returned empty content');
      break;
    }

    // Heurística: se a página não contém nenhuma intimação/citação/comunicação → fim.
    const hasItems = /Intimação|Citação|Comunicação/i.test(markdown) || /Intimação|Citação|Comunicação/i.test(html);
    if (!hasItems) {
      console.log(`firecrawl: page ${pagina} sem itens — fim da paginação`);
      break;
    }

    // Detecta página repetida (DJEN sem `pagina` válida volta sempre à página 1).
    const signature = (markdown || html).slice(0, 500);
    if (signature === lastSignature) {
      console.log(`firecrawl: page ${pagina} idêntica à anterior — fim da paginação`);
      break;
    }
    lastSignature = signature;

    htmlParts.push(html);
    mdParts.push(markdown);

    // Pequeno respiro para não estourar rate limit do Firecrawl.
    if (pagina < MAX_PAGES) await new Promise(r => setTimeout(r, 500));
  }

  return {
    html: htmlParts.join('\n\n'),
    markdown: mdParts.join('\n\n'),
    pages: pagesFetched,
  };
}

// ===== Markdown fallback parser for DJEN content from Firecrawl =====
// Used when HTML parsing yields 0 (Firecrawl markdown is cleaner).
function parseDjenFromMarkdown(markdown: string, sigla: string, mon: any): any[] {
  const publicacoes: any[] = [];
  const nomePesquisado = mon.nome || `OAB ${mon.oab_numero || ''}/${mon.oab_uf || ''}`;

  // Split markdown into intimação blocks. The DJEN page typically renders each
  // intimação starting with "N - Intimação" / "N - Citação" / "N - Comunicação".
  const blocks = markdown.split(/(?=^\s*\d+\s*-\s*(?:Intimação|Citação|Comunicação)\b)/im);

  for (const block of blocks) {
    if (!/Intimação|Citação|Comunicação/i.test(block)) continue;

    const dataMatch = block.match(/(?:Data(?: de disponibilização)?|disponibilização)[:\s]*\**\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (!dataMatch) continue;
    const [dia, mes, ano] = dataMatch[1].split('/');
    const dataDisp = `${ano}-${mes}-${dia}`;

    const procMatch = block.match(/Processo[:\s]*\**\s*([\d.\-]+)/i)
      || block.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    const numeroProcesso = procMatch ? procMatch[1].trim() : 'sem_numero';

    const orgaoMatch = block.match(/Órgão[:\s]*\**\s*([^\n]+)/i);
    const orgao = orgaoMatch ? orgaoMatch[1].replace(/\*+/g, '').trim() : null;

    const tipoMatch = block.match(/Tipo de comunicação[:\s]*\**\s*([^\n]+)/i);
    const tipoCom = tipoMatch ? tipoMatch[1].replace(/\*+/g, '').trim() : 'Intimação';
    const tipo = /citação|citacao/i.test(tipoCom) ? 'Citação' : 'Intimação';

    const partesMatch = block.match(/Parte\(s\)[:\s]*\**([\s\S]*?)(?=Advogado\(s\)|Texto da intimação|$)/i);
    const partes = partesMatch
      ? partesMatch[1].replace(/\*+/g, '').replace(/\s+/g, ' ').trim().substring(0, 2000)
      : null;

    const textoMatch = block.match(/Texto da intimação[:\s]*\**([\s\S]*?)(?=^\s*\d+\s*-\s*(?:Intimação|Citação|Comunicação)|$)/im);
    let conteudo = textoMatch
      ? textoMatch[1].replace(/\*+/g, '').trim()
      : block.replace(/\*+/g, '').trim();
    conteudo = conteudo.substring(0, 5000);

    publicacoes.push({
      tenant_id: mon.tenant_id,
      monitoramento_id: mon.id,
      data_disponibilizacao: dataDisp,
      data_publicacao: dataDisp,
      tipo,
      numero_processo: numeroProcesso,
      diario_sigla: sigla,
      diario_nome: `PJe Comunicações - ${sigla}`,
      comarca: null,
      nome_pesquisado: nomePesquisado,
      conteudo_completo: conteudo,
      link_acesso: 'https://comunica.pje.jus.br',
      status: 'nao_tratada',
      orgao,
      responsavel: null,
      partes,
    });
  }

  return publicacoes;
}

// ===== Unified DJEN scrape via Firecrawl: returns parsed publicações for a (sigla, mon) =====
async function scrapeAndParseDjenFirecrawl(
  sigla: string,
  mon: any,
  dataInicio: string,
  dataFim: string,
): Promise<any[]> {
  const oabNumero = mon.oab_numero || '';
  const oabUf = mon.oab_uf || '';
  if (!oabNumero || !oabUf) return [];

  const { html, markdown } = await scrapeDjenViaFirecrawl({
    sigla, oabNumero, oabUf, dataInicio, dataFim,
  });

  // Try HTML parser first (matches existing format), fall back to markdown parser.
  let pubs = html ? parsePublicacoesPjeOab(html, sigla, mon) : [];
  if (pubs.length === 0 && markdown) {
    pubs = parseDjenFromMarkdown(markdown, sigla, mon);
  }
  return pubs;
}

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

// ===== Comunica API JSON Parser =====
function parsePublicacoesApiJson(jsonData: any, sigla: string, mon: any): any[] {
  const publicacoes: any[] = [];
  const nomePesquisado = mon.nome || `OAB ${mon.oab_numero || ''}/${mon.oab_uf || ''}`;

  // The API may return { items: [...] } or { comunicacoes: [...] } or be an array directly
  let items: any[] = [];
  if (Array.isArray(jsonData)) {
    items = jsonData;
  } else if (jsonData?.items && Array.isArray(jsonData.items)) {
    items = jsonData.items;
  } else if (jsonData?.comunicacoes && Array.isArray(jsonData.comunicacoes)) {
    items = jsonData.comunicacoes;
  } else if (jsonData?.content && Array.isArray(jsonData.content)) {
    items = jsonData.content;
  } else {
    // Log the structure so we can adapt
    console.log('comunica_api: unknown JSON structure, keys:', Object.keys(jsonData || {}));
    // Try to find any array in the response
    for (const key of Object.keys(jsonData || {})) {
      if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
        console.log(`comunica_api: found array at key "${key}" with ${jsonData[key].length} items`);
        items = jsonData[key];
        break;
      }
    }
  }

  if (items.length > 0) {
    console.log(`comunica_api: parsing ${items.length} items. Sample keys:`, Object.keys(items[0] || {}));
  }

  for (const item of items) {
    // Flexible field mapping - adapt to whatever the API returns
    const dataDisp = item.dataDisponibilizacao || item.data_disponibilizacao 
      || item.dtDisponibilizacao || item.dataPublicacao || item.data || null;
    
    if (!dataDisp) continue;

    // Normalize date to YYYY-MM-DD
    let dataFormatted = dataDisp;
    if (dataDisp.includes('/')) {
      const parts = dataDisp.split('/');
      if (parts.length === 3) {
        dataFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } else if (dataDisp.includes('T')) {
      dataFormatted = dataDisp.split('T')[0];
    }

    const numeroProcesso = item.numeroProcesso || item.numero_processo 
      || item.nrProcesso || item.processo || 'sem_numero';
    
    const orgao = item.orgao || item.nomeOrgao || item.orgaoJulgador || null;
    const comarca = item.comarca || item.municipio || null;
    
    const tipoCom = item.tipoComunicacao || item.tipo || item.tipoDocumento || 'Intimação';
    const tipo = tipoCom.toLowerCase().includes('citação') || tipoCom.toLowerCase().includes('citacao')
      ? 'Citação' : 'Intimação';

    // Content: try multiple fields
    const conteudo = item.texto || item.conteudo || item.textoIntimacao 
      || item.descricao || item.teor || item.mensagem || '';

    const partes = item.partes || item.nomePartes || item.destinatario || null;
    const linkAcesso = item.link || item.linkAcesso || item.url 
      || `https://comunica.pje.jus.br/consulta?siglaTribunal=${sigla}&numeroProcesso=${numeroProcesso.replace(/\D/g, '')}`;

    publicacoes.push({
      tenant_id: mon.tenant_id,
      monitoramento_id: mon.id,
      data_disponibilizacao: dataFormatted,
      data_publicacao: dataFormatted,
      tipo,
      numero_processo: numeroProcesso,
      diario_sigla: sigla,
      diario_nome: `PJe Comunicações - ${sigla}`,
      comarca,
      nome_pesquisado: nomePesquisado,
      conteudo_completo: (typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo)).substring(0, 5000),
      link_acesso: linkAcesso,
      status: 'nao_tratada',
      orgao,
      responsavel: null,
      partes: typeof partes === 'string' ? partes?.substring(0, 2000) : partes ? JSON.stringify(partes).substring(0, 2000) : null,
    });
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
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.error(`pje_scraper: error for ${numeroCnj}:`, errorMessage);
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
      // forceSource: 'auto' (default, n8n with firecrawl fallback), 'n8n', or 'firecrawl'
      const forceSource: 'auto' | 'n8n' | 'firecrawl' =
        body.force_source === 'n8n' || body.force_source === 'firecrawl' ? body.force_source : 'auto';

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

      // Date range: configurable via body { data_inicio, data_fim, dias_retroativos }
      // Defaults to last 5 days. Hard cap of 90 days to control Firecrawl costs.
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const isValidYmd = (s: any): s is string =>
        typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00').getTime());

      let dataFim = new Date();
      let dataInicio = new Date();
      const diasRetroativosRaw = Number(body.dias_retroativos);
      const diasRetroativos = Number.isFinite(diasRetroativosRaw) && diasRetroativosRaw > 0
        ? Math.min(Math.floor(diasRetroativosRaw), 90)
        : 5;

      if (isValidYmd(body.data_inicio) && isValidYmd(body.data_fim)) {
        dataInicio = new Date(body.data_inicio + 'T12:00:00');
        dataFim = new Date(body.data_fim + 'T12:00:00');
        if (dataFim < dataInicio) {
          return new Response(JSON.stringify({
            success: false, error: 'data_fim deve ser >= data_inicio',
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const diffDays = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
          return new Response(JSON.stringify({
            success: false, error: 'Intervalo máximo permitido: 90 dias',
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        dataInicio.setDate(dataInicio.getDate() - diasRetroativos);
      }

      console.log(`pje_scraper_oab: range ${formatDate(dataInicio)} → ${formatDate(dataFim)}`);

      // Long-running work (n8n + Firecrawl per tribunal) easily exceeds the 150s
      // edge function idle timeout. Run it in background via EdgeRuntime.waitUntil
      // and return immediately so the UI doesn't see a 504.
      const runScraping = async () => {
        let totalInserted = 0;
        let totalFound = 0;
        let totalErrors = 0;
        let cnjApiCount = 0;
        let n8nCount = 0;
        let firecrawlCount = 0;

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

        console.log(`pje_scraper_oab: monitoramento ${mon.id} (${nome || oabNumero}) - ${allSiglas.length} tribunais — fonte=${forceSource}`);

        // Process each tribunal:
        //  - 'auto'      → API oficial CNJ (sem fallback automático para evitar custo)
        //  - 'firecrawl' → força Firecrawl (emergência)
        //  - 'n8n'       → força n8n legado (deprecated)
        for (const sigla of allSiglas) {
          let pubs: any[] = [];
          let usedSource: 'cnj_api' | 'n8n' | 'firecrawl' | null = null;

          // ===== CNJ API attempt (default 'auto') =====
          if (forceSource === 'auto') {
            try {
              const result = await fetchComunicacoesViaApiOficial({
                sigla,
                oabNumero,
                oabUf,
                dataInicio: formatDate(dataInicio),
                dataFim: formatDate(dataFim),
              });
              console.log(`cnj_api: ${sigla}/OAB ${oabNumero}/${oabUf} — ${result.pages} páginas, ${result.items.length} itens`);
              if (result.items.length > 0) {
                pubs = parsePublicacoesApiJson(result.items, sigla, mon);
                usedSource = 'cnj_api';
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(`cnj_api: failed for ${sigla} OAB ${oabNumero}/${oabUf}: ${msg}`);
              totalErrors++;
              // Não cai em fallback automático — mantém custo controlado.
            }
          }

          // ===== n8n attempt =====
          if (forceSource === 'n8n') {
            console.warn(`pje_scraper_oab: n8n source is DEPRECATED, prefer 'auto' (CNJ API)`);
          try {
            const webhookPayload = {
              siglaTribunal: sigla,
              numeroOab: oabNumero,
              ufOab: oabUf.toLowerCase(),
              dataInicio: formatDate(dataInicio),
              dataFim: formatDate(dataFim),
            };

            console.log(`pje_scraper_oab: calling n8n for ${sigla} OAB ${oabNumero}/${oabUf}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const webhookRes = await fetch(N8N_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!webhookRes.ok) {
              const errText = await webhookRes.text().catch(() => '');
              console.error(`pje_scraper_oab: n8n error ${webhookRes.status} for ${sigla}: ${errText.substring(0, 200)}`);
              throw new Error(`n8n HTTP ${webhookRes.status}`);
            }

            const webhookData = await webhookRes.json();
            const items = webhookData?.data || [];

            if (items.length === 0) {
              console.log(`pje_scraper_oab: n8n returned 0 items for ${sigla}`);
              continue;
            }

            console.log(`pje_scraper_oab: n8n returned ${items.length} items for ${sigla}`);

            const nomePesquisado = nome || `OAB ${oabNumero}/${oabUf}`;
            const today = new Date().toISOString().split('T')[0];

            pubs = items.map((item: any) => {
              const descricao = item.descricao || '';
              const tipo = descricao.toLowerCase().includes('intimação') || descricao.toLowerCase().includes('intimacao') ? 'Intimação'
                : descricao.toLowerCase().includes('citação') || descricao.toLowerCase().includes('citacao') ? 'Citação'
                : descricao.toLowerCase().includes('sentença') || descricao.toLowerCase().includes('sentenca') ? 'Sentença'
                : descricao.toLowerCase().includes('despacho') ? 'Despacho'
                : descricao.toLowerCase().includes('decisão') || descricao.toLowerCase().includes('decisao') ? 'Decisão'
                : 'Comunicação';

              return {
                tenant_id: mon.tenant_id,
                monitoramento_id: mon.id,
                data_disponibilizacao: item.dataPublicacao || today,
                data_publicacao: item.dataPublicacao || today,
                tipo,
                numero_processo: item.numeroProcesso || 'sem_numero',
                diario_sigla: item.tribunal || sigla,
                diario_nome: `PJe Comunicações - ${item.tribunal || sigla}`,
                comarca: null,
                nome_pesquisado: nomePesquisado,
                conteudo_completo: descricao.substring(0, 5000),
                link_acesso: 'https://comunica.pje.jus.br',
                status: 'nao_tratada',
                orgao: item.orgao || null,
                responsavel: null,
                partes: item.partes || null,
              };
            });
            usedSource = 'n8n';
          } catch (err: any) {
            console.error(`pje_scraper_oab: n8n failed for ${sigla}: ${err.message}`);
            totalErrors++;
            continue;
          }
          }

          // ===== Firecrawl attempt (apenas se forçado manualmente) =====
          if (pubs.length === 0 && forceSource === 'firecrawl') {
            try {
              console.log(`pje_scraper_oab: trying Firecrawl for ${sigla} OAB ${oabNumero}/${oabUf}`);
              pubs = await scrapeAndParseDjenFirecrawl(
                sigla, mon, formatDate(dataInicio), formatDate(dataFim),
              );
              if (pubs.length > 0) {
                usedSource = 'firecrawl';
                console.log(`pje_scraper_oab: Firecrawl returned ${pubs.length} items for ${sigla}`);
              } else {
                console.log(`pje_scraper_oab: Firecrawl returned 0 items for ${sigla}`);
              }
            } catch (err: any) {
              console.error(`pje_scraper_oab: Firecrawl failed for ${sigla}: ${err.message}`);
              totalErrors++;
            }
          }

          // ===== Persist results =====
          if (pubs.length > 0 && usedSource) {
            totalFound += pubs.length;
            const { data: inserted, error: insertErr } = await supabaseAdmin
              .from('publicacoes')
              .upsert(pubs, {
                onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
                ignoreDuplicates: true,
              })
              .select('id');

            if (insertErr) {
              console.error(`pje_scraper_oab: insert error for ${sigla}: ${insertErr.message}`);
            } else {
              const insCount = inserted?.length || 0;
              totalInserted += insCount;
              if (usedSource === 'cnj_api') cnjApiCount += insCount;
              else if (usedSource === 'n8n') n8nCount += insCount;
              else if (usedSource === 'firecrawl') firecrawlCount += insCount;
            }
          }

          // Pequeno delay entre tribunais para evitar rate limit (curto pois CNJ API é leve).
          await new Promise(r => setTimeout(r, forceSource === 'auto' ? 300 : 2000));
        }
        }

        console.log(`pje_scraper_oab done: found=${totalFound}, inserted=${totalInserted}, errors=${totalErrors}, cnj_api=${cnjApiCount}, n8n=${n8nCount}, firecrawl=${firecrawlCount}`);
      };

      // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
      const canRunInBackground = typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime?.waitUntil === 'function';

      if (!canRunInBackground) {
        console.warn('pje_scraper_oab: EdgeRuntime.waitUntil indisponível; ignorando execução longa para evitar IDLE_TIMEOUT');
        return new Response(JSON.stringify({
          success: false,
          queued: false,
          retryable: true,
          source: 'pje_scraper_oab',
          force_source: forceSource,
          date_range: { data_inicio: formatDate(dataInicio), data_fim: formatDate(dataFim) },
          error: 'Processamento assíncrono indisponível no runtime atual. Tente novamente em instantes.',
        }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // @ts-ignore
      EdgeRuntime.waitUntil(runScraping());

      return new Response(JSON.stringify({
        success: true,
        queued: true,
        monitoramentos_processed: monitoramentos.length,
        source: 'pje_scraper_oab',
        force_source: forceSource,
        date_range: { data_inicio: formatDate(dataInicio), data_fim: formatDate(dataFim) },
        message: 'Busca iniciada em segundo plano. Os resultados aparecerão na lista em alguns minutos.',
      }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // === API TEST COMUNICA MODE ===
    if (mode === 'api_test_comunica') {
      const tribunal = body.tribunal || 'TJPR';
      const oabNumero = body.oab_numero || '';
      const oabUf = body.oab_uf || 'pr';
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - (body.dias || 30));
      const fmtDate = (d: Date) => d.toISOString().split('T')[0];

      let apiUrl = `https://comunicaapi.pje.jus.br/api/v1/comunicacoes`
        + `?siglaTribunal=${tribunal}`
        + `&dataDisponibilizacaoInicio=${fmtDate(dataInicio)}`
        + `&dataDisponibilizacaoFim=${fmtDate(dataFim)}`;
      if (oabNumero) apiUrl += `&numeroOab=${oabNumero}`;
      if (oabUf) apiUrl += `&ufOab=${oabUf.toLowerCase()}`;

      console.log(`api_test_comunica: fetching ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const contentType = response.headers.get('content-type') || '';
      const bodyText = await response.text();

      let parsed: any = null;
      let itemCount = 0;
      try {
        parsed = JSON.parse(bodyText);
        // Try to find items count
        if (Array.isArray(parsed)) itemCount = parsed.length;
        else {
          for (const key of Object.keys(parsed || {})) {
            if (Array.isArray(parsed[key])) { itemCount = parsed[key].length; break; }
          }
        }
      } catch { /* not JSON */ }

      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        content_type: contentType,
        url_tested: apiUrl,
        response_length: bodyText.length,
        is_json: contentType.includes('json'),
        item_count: itemCount,
        top_level_keys: parsed ? Object.keys(parsed) : null,
        sample: parsed ? JSON.stringify(parsed).substring(0, 2000) : bodyText.substring(0, 2000),
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
