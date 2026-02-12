import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = 'https://ietjmyrelhijxyozcequ.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

const BATCH_SIZE = 5;

// Map tribunal siglas to DataJud endpoint codes
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

async function buscarViaDataJud(tribunal: string, numeroProcesso: string): Promise<any> {
  const tribunalCode = TRIBUNAL_MAP[tribunal.toUpperCase()] || tribunal.toLowerCase();
  const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunalCode}/_search`;
  const numeroFormatado = numeroProcesso.replace(/[.-]/g, '');

  console.log(`DataJud request: ${apiUrl} | processo: ${numeroFormatado}`);

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

function mapMovimentacoesToPublicacoes(
  hits: any[],
  sigla: string,
  mon: any,
  dataInicio: string
): any[] {
  const pubs: any[] = [];
  const dataInicioDate = new Date(dataInicio);

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const numeroProcesso = source.numeroProcesso || '';
    // Format CNJ number: NNNNNNN-DD.AAAA.J.TR.OOOO
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

    // === API TEST MODE: raw DataJud response ===
    if (mode === 'api_test') {
      const tribunal = body.tribunal || 'TJPR';
      const numeroProcesso = body.numero_processo || '';

      if (!numeroProcesso) {
        return new Response(JSON.stringify({ success: false, error: 'numero_processo required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await buscarViaDataJud(tribunal, numeroProcesso);
      const hits = data.hits?.hits || [];

      return new Response(JSON.stringify({
        success: true,
        total_hits: data.hits?.total?.value || hits.length,
        hits_count: hits.length,
        raw_first_hit: hits[0]?._source || null,
        movimentacoes_count: hits[0]?._source?.movimentos?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === N8N TEST MODE: raw webhook response ===
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
        siglaTribunal: tribunal,
        numeroOab: oabNumero,
        ufOab: oabUf.toLowerCase(),
        dataInicio: body.data_inicio || ninetyDaysAgo,
        dataFim: body.data_fim || today,
      };
      console.log('n8n_test: calling webhook with', JSON.stringify(webhookPayload));
      const webhookRes = await fetch('https://voutibot.app.n8n.cloud/webhook/tjpr-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      const webhookData = await webhookRes.json();
      return new Response(JSON.stringify({
        success: true,
        webhook_status: webhookRes.status,
        webhook_response: webhookData,
        total_results: webhookData?.totalResults || webhookData?.data?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === N8N SCRAPER MODE: fetch from n8n webhook and insert into publicacoes ===
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
        siglaTribunal: tribunal,
        numeroOab: oabNumero,
        ufOab: oabUf.toLowerCase(),
        dataInicio: body.data_inicio || ninetyDaysAgo,
        dataFim: body.data_fim || today,
      };

      console.log('n8n_scraper: calling webhook with', JSON.stringify(webhookPayload));
      const webhookRes = await fetch('https://voutibot.app.n8n.cloud/webhook/tjpr-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Get monitoramento name if available
      let nomePesquisado = `OAB ${oabNumero}/${oabUf}`;
      if (monitoramentoId) {
        const { data: mon } = await supabaseAdmin
          .from('publicacoes_monitoramentos')
          .select('nome')
          .eq('id', monitoramentoId)
          .single();
        if (mon?.nome) nomePesquisado = mon.nome;
      }

      // Map n8n items to publicacoes format
      const pubs = items.map((item: any) => {
        const descricao = item.descricao || '';
        const tipo = descricao.toLowerCase().includes('intimação') || descricao.toLowerCase().includes('intimacao') ? 'Intimação'
          : descricao.toLowerCase().includes('citação') || descricao.toLowerCase().includes('citacao') ? 'Citação'
          : descricao.toLowerCase().includes('sentença') || descricao.toLowerCase().includes('sentenca') ? 'Sentença'
          : descricao.toLowerCase().includes('despacho') ? 'Despacho'
          : descricao.toLowerCase().includes('decisão') || descricao.toLowerCase().includes('decisao') ? 'Decisão'
          : 'Comunicação';

        return {
          tenant_id: tenantId,
          monitoramento_id: monitoramentoId,
          data_disponibilizacao: item.dataPublicacao || today,
          data_publicacao: item.dataPublicacao || today,
          tipo,
          numero_processo: item.numeroProcesso || null,
          diario_sigla: item.tribunal || tribunal,
          diario_nome: `PJe Comunicações - ${item.tribunal || tribunal}`,
          comarca: null,
          nome_pesquisado: nomePesquisado,
          conteudo_completo: descricao.substring(0, 5000),
          link_acesso: 'https://comunica.pje.jus.br',
          status: 'nao_tratada',
          orgao: null,
          responsavel: null,
          partes: null,
        };
      });

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('publicacoes')
        .upsert(pubs, {
          onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
          ignoreDuplicates: true,
        })
        .select('id');

      if (insertError) throw new Error(`Insert error: ${insertError.message}`);

      console.log(`n8n_scraper: inserted ${inserted?.length || 0} publicações from ${items.length} items`);

      return new Response(JSON.stringify({
        success: true,
        inserted: inserted?.length || 0,
        total_from_webhook: items.length,
        source: 'n8n_scraper',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SEED MODE ===
    if (mode === 'seed' && body.record) {
      const { data, error } = await supabaseAdmin
        .from('publicacoes')
        .insert(body.record)
        .select()
        .single();
      if (error) throw new Error(`Seed insert error: ${error.message}`);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === MAIN MODE: buscar publicações via DataJud ===
    const monitoramentoId = body.monitoramento_id;

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

    console.log(`Processing ${monitoramentos.length} monitoramentos via DataJud`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const mon of monitoramentos) {
      const tribunais = mon.tribunais_monitorados as Record<string, string[]>;
      if (!tribunais) continue;

      const allSiglas = Object.values(tribunais).flat();
      const today = new Date().toISOString().split('T')[0];
      const dataInicio = mon.data_inicio_monitoramento || today;

      // We need process numbers to search DataJud - use existing publicacoes or processos_oab
      // For now, search by OAB number indirectly: get processos_oab linked to this tenant
      const { data: processos } = await supabaseAdmin
        .from('processos_oab')
        .select('numero_cnj, tribunal')
        .eq('tenant_id', mon.tenant_id)
        .not('numero_cnj', 'is', null);

      const processosToSearch = processos || [];

      for (let i = 0; i < allSiglas.length; i += BATCH_SIZE) {
        const batch = allSiglas.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(async (sigla) => {
            try {
              // Filter processos for this tribunal
              const tribunalProcessos = processosToSearch.filter(
                (p: any) => p.tribunal?.toUpperCase() === sigla.toUpperCase()
              );

              if (tribunalProcessos.length === 0) {
                console.log(`No processos found for tribunal ${sigla}, skipping`);
                return 0;
              }

              let allPubs: any[] = [];

              for (const proc of tribunalProcessos) {
                try {
                  const data = await buscarViaDataJud(sigla, proc.numero_cnj);
                  const hits = data.hits?.hits || [];
                  const pubs = mapMovimentacoesToPublicacoes(hits, sigla, mon, dataInicio);
                  allPubs = allPubs.concat(pubs);
                } catch (err) {
                  console.error(`Error fetching ${proc.numero_cnj} from ${sigla}:`, err);
                }
              }

              if (allPubs.length === 0) return 0;

              const { data: inserted } = await supabaseAdmin
                .from('publicacoes')
                .upsert(allPubs, {
                  onConflict: 'tenant_id,monitoramento_id,numero_processo,data_disponibilizacao,diario_sigla',
                  ignoreDuplicates: true,
                })
                .select('id');

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

    console.log(`Done: ${totalInserted} inserted, ${totalErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      inserted: totalInserted,
      errors: totalErrors,
      monitoramentos_processed: monitoramentos.length,
      source: 'datajud_api',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
