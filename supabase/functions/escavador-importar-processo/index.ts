import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const V2_BASE = 'https://api.escavador.com/api/v2';
const MAX_MOVS = 500;
const PAGE_LIMIT = 100;

function pickName(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  return obj.nome ?? obj.sigla ?? obj.descricao ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      processoId,
      numeroProcesso,
      tenantId = null,
      ativarMonitoramento = false,
    } = await req.json();

    if (!processoId || !numeroProcesso) {
      throw new Error('processoId e numeroProcesso sao obrigatorios');
    }

    console.log('[Escavador Importar V2] 🔧 Iniciando:', numeroProcesso, '| monitoramento:', ativarMonitoramento);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      throw new Error('Token Escavador não configurado');
    }

    const cnjFormatado = numeroProcesso;
    const headers = {
      'Authorization': `Bearer ${escavadorToken}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    let creditosTotal = 0;

    // === 1. CAPA (V2) ===
    const capaUrl = `${V2_BASE}/processos/numero_cnj/${encodeURIComponent(cnjFormatado)}`;
    const capaResp = await fetch(capaUrl, { headers });
    creditosTotal += Number(capaResp.headers.get('Creditos-Utilizados') || 0);

    if (!capaResp.ok) {
      const txt = await capaResp.text();
      console.error('[Escavador Importar V2] capa falhou:', capaResp.status, txt);
      return Response.json(
        { success: false, message: `Erro ao buscar processo (${capaResp.status})`, error: txt },
        { headers: corsHeaders }
      );
    }

    const capa = await capaResp.json();
    const proc = capa?.data ?? capa; // a API às vezes envelopa em { data: {...} }

    if (!proc || (!proc.numero_cnj && !proc.fontes && !proc.classe)) {
      console.error('[Escavador Importar V2] payload vazio:', capa);
      return Response.json(
        { success: false, message: 'Processo não encontrado no Escavador' },
        { headers: corsHeaders }
      );
    }

    const classeNome = pickName(proc.classe) ?? null;
    const assuntoNome = pickName(proc.assunto) ?? pickName(proc.assuntos?.[0]) ?? null;
    const areaNome = pickName(proc.area) ?? null;
    const tribunalNome = pickName(proc.tribunal) ?? null;
    const valorCausa = typeof proc.valor_causa === 'object'
      ? (proc.valor_causa?.valor ?? null)
      : (proc.valor_causa ?? null);
    const dataDistribuicao = proc.data_inicio ?? proc.data_distribuicao ?? null;
    const escavadorIdStr = String(proc.id ?? proc.numero_cnj ?? cnjFormatado);

    console.log('[Escavador Importar V2] ✅ Capa:', {
      classe: classeNome, tribunal: tribunalNome, valorCausa, dataDistribuicao,
    });

    // === 2. UPSERT MONITORAMENTO (capa) ===
    const { error: upsertError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .upsert(
        {
          processo_id: processoId,
          tenant_id: tenantId,
          escavador_id: escavadorIdStr,
          escavador_data: proc,
          classe: classeNome,
          assunto: assuntoNome,
          area: areaNome,
          tribunal: tribunalNome,
          data_distribuicao: dataDistribuicao,
          valor_causa: valorCausa,
          monitoramento_ativo: !!ativarMonitoramento,
          ultima_consulta: new Date().toISOString(),
        },
        { onConflict: 'processo_id' }
      );

    if (upsertError) {
      console.error('[Escavador Importar V2] erro monitoramento:', upsertError);
      throw upsertError;
    }

    // === 2.1 ATUALIZAR DADOS DA CAPA NO PROCESSO ===
    try {
      const updates: Record<string, any> = {};
      if (classeNome) updates.tipo_acao_nome = classeNome;
      if (tribunalNome) updates.tribunal_nome = tribunalNome;
      if (valorCausa != null) updates.valor_causa = valorCausa;
      if (dataDistribuicao) updates.data_distribuicao = dataDistribuicao;
      if (Object.keys(updates).length > 0) {
        const { error: pUpdErr } = await supabaseClient
          .from('processos')
          .update(updates)
          .eq('id', processoId);
        if (pUpdErr) console.error('[Escavador Importar V2] update processos:', pUpdErr.message);
      }
    } catch (e) {
      console.error('[Escavador Importar V2] erro update processos:', e);
    }

    // === 3. MOVIMENTAÇÕES (V2 paginado por cursor) ===
    const movimentacoes: any[] = [];
    let nextUrl: string | null =
      `${V2_BASE}/processos/numero_cnj/${encodeURIComponent(cnjFormatado)}/movimentacoes?limit=${PAGE_LIMIT}`;

    while (nextUrl && movimentacoes.length < MAX_MOVS) {
      const movResp = await fetch(nextUrl, { headers });
      creditosTotal += Number(movResp.headers.get('Creditos-Utilizados') || 0);
      if (!movResp.ok) {
        console.error('[Escavador Importar V2] movs falhou:', movResp.status, await movResp.text());
        break;
      }
      const page = await movResp.json();
      const items: any[] = page?.items ?? page?.data ?? [];
      movimentacoes.push(...items);
      nextUrl = page?.links?.next ?? null;
      if (!items.length) break;
    }

    console.log(`[Escavador Importar V2] coletadas ${movimentacoes.length} movs | créditos: ${creditosTotal}`);

    // Deduplicar contra o que já existe (idempotência)
    const { data: existentes } = await supabaseClient
      .from('processo_atualizacoes_escavador')
      .select('descricao, data_evento')
      .eq('processo_id', processoId);

    const chaveExistente = new Set(
      (existentes || []).map((r: any) => `${r.data_evento}|${(r.descricao || '').slice(0, 200)}`)
    );

    let totalSalvas = 0;
    for (const mov of movimentacoes) {
      const descricao = mov.conteudo || mov.tipo || mov.descricao || 'Sem descrição';
      const dataEvento = mov.data || mov.data_evento || new Date().toISOString();
      const chave = `${dataEvento}|${String(descricao).slice(0, 200)}`;
      if (chaveExistente.has(chave)) continue;

      const { error: movError } = await supabaseClient
        .from('processo_atualizacoes_escavador')
        .insert({
          processo_id: processoId,
          tenant_id: tenantId,
          tipo_atualizacao: 'importacao_inicial',
          descricao,
          data_evento: dataEvento,
          dados_completos: mov,
          lida: false,
          notificacao_enviada: false,
        });

      if (!movError) {
        totalSalvas++;
        chaveExistente.add(chave);
      } else {
        console.error('[Escavador Importar V2] erro inserindo mov:', movError.message);
      }
    }

    console.log(`[Escavador Importar V2] ✅ ${totalSalvas} novas movs salvas`);

    return Response.json(
      {
        success: true,
        andamentosInseridos: totalSalvas,
        monitoramentoAtivado: !!ativarMonitoramento,
        creditosUtilizados: creditosTotal,
        capa: {
          classe: classeNome,
          assunto: assuntoNome,
          area: areaNome,
          tribunal: tribunalNome,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Escavador Importar V2] 💥 Erro:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});