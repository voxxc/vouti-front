import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = 'https://ietjmyrelhijxyozcequ.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

const BATCH_SIZE = 5; // Process 5 tribunais at a time

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'manual';
    const monitoramentoId = body.monitoramento_id;

    // Fetch active monitoramentos
    let query = supabaseAdmin
      .from('publicacoes_monitoramentos')
      .select('*')
      .eq('status', 'ativo');

    if (monitoramentoId) {
      query = query.eq('id', monitoramentoId);
    }

    const { data: monitoramentos, error: mError } = await query;
    if (mError) throw new Error(`Error fetching monitoramentos: ${mError.message}`);
    if (!monitoramentos || monitoramentos.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active monitoramentos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${monitoramentos.length} monitoramentos`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const mon of monitoramentos) {
      const tribunais = mon.tribunais_monitorados as Record<string, string[]>;
      if (!tribunais) continue;

      const allSiglas = Object.values(tribunais).flat();
      const today = new Date().toISOString().split('T')[0];
      const dataInicio = mon.data_inicio_monitoramento || today;

      // Process in batches
      for (let i = 0; i < allSiglas.length; i += BATCH_SIZE) {
        const batch = allSiglas.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(async (sigla) => {
            try {
              const url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${sigla}&dataDisponibilizacaoInicio=${dataInicio}&dataDisponibilizacaoFim=${today}&numeroOab=${mon.oab_numero}&ufOab=${mon.oab_uf?.toLowerCase()}`;

              if (!FIRECRAWL_API_KEY) {
                console.warn('FIRECRAWL_API_KEY not configured, skipping scrape');
                return 0;
              }

              const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url,
                  formats: ['markdown'],
                  waitFor: 5000,
                  onlyMainContent: true,
                }),
              });

              const scrapeData = await scrapeRes.json();
              const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';

              if (!markdown || markdown.includes('Nenhuma comunicação encontrada')) {
                return 0;
              }

              // Parse publications from markdown
              const pubs = parsePublicacoes(markdown, sigla, mon, today);

              if (pubs.length === 0) return 0;

              // Insert (ignore duplicates via ON CONFLICT)
              const { data: inserted, error: insertErr } = await supabaseAdmin
                .from('publicacoes')
                .upsert(pubs, { onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla', ignoreDuplicates: true })
                .select('id');

              return inserted?.length || 0;
            } catch (err) {
              console.error(`Error scraping ${sigla}:`, err);
              return 0;
            }
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') totalInserted += r.value;
          else totalErrors++;
        }

        // Small delay between batches
        if (i + BATCH_SIZE < allSiglas.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    console.log(`Done: ${totalInserted} inserted, ${totalErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      inserted: totalInserted,
      errors: totalErrors,
      monitoramentos_processed: monitoramentos.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parsePublicacoes(markdown: string, sigla: string, mon: any, today: string): any[] {
  const pubs: any[] = [];

  // Split by sections that look like publication entries
  // The PJE portal typically shows entries with process numbers, dates, types
  const sections = markdown.split(/(?=\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);

  for (const section of sections) {
    if (section.trim().length < 20) continue;

    // Try to extract process number (CNJ format)
    const processoMatch = section.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    if (!processoMatch) continue;

    const numeroProcesso = processoMatch[1];

    // Extract date
    const dateMatch = section.match(/(\d{2}\/\d{2}\/\d{4})/);
    let dataDisp = today;
    if (dateMatch) {
      const parts = dateMatch[1].split('/');
      dataDisp = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Extract type (Intimação, Citação, etc.)
    const tipoMatch = section.match(/(Intimação|Citação|Edital|Decisão|Despacho|Sentença)/i);

    // Extract comarca/orgao
    const orgaoMatch = section.match(/(?:Vara|Câmara|Turma|Seção)[^\n]*/i);

    pubs.push({
      tenant_id: mon.tenant_id,
      monitoramento_id: mon.id,
      data_disponibilizacao: dataDisp,
      data_publicacao: dataDisp,
      tipo: tipoMatch ? tipoMatch[1] : 'Comunicação',
      numero_processo: numeroProcesso,
      diario_sigla: sigla,
      diario_nome: null,
      comarca: null,
      nome_pesquisado: mon.nome,
      conteudo_completo: section.trim().substring(0, 5000),
      link_acesso: `https://comunica.pje.jus.br/consulta?siglaTribunal=${sigla}&dataDisponibilizacaoInicio=${dataDisp}&dataDisponibilizacaoFim=${dataDisp}&numeroOab=${mon.oab_numero}&ufOab=${mon.oab_uf?.toLowerCase()}`,
      status: 'nao_tratada',
      orgao: orgaoMatch ? orgaoMatch[0].trim() : null,
      responsavel: null,
      partes: null,
    });
  }

  return pubs;
}
