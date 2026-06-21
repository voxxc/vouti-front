import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const V2_BASE = 'https://api.escavador.com/api/v2';
const MAX_MOVS = 500;
const PAGE_LIMIT = 100;

function dedupHashOab(processoOabId: string, descricao: string, dataMov: string): string {
  const hashSrc = `${processoOabId}|${(descricao || '').trim().slice(0, 200)}|${(dataMov || '').slice(0, 19)}`;
  let h = 0;
  for (let i = 0; i < hashSrc.length; i++) {
    h = ((h << 5) - h) + hashSrc.charCodeAt(i);
    h |= 0;
  }
  return `esc_${Math.abs(h)}`;
}

function pickName(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  return obj.nome ?? obj.sigla ?? obj.descricao ?? null;
}

function pickBestFonte(fontes: any[] | null | undefined): any | null {
  if (!Array.isArray(fontes) || fontes.length === 0) return null;
  const score = (f: any) => {
    let s = 0;
    if (f?.capa) s += 100;
    if (f?.arquivado === false) s += 10;
    if (typeof f?.grau === 'number') s += f.grau;
    if (Array.isArray(f?.envolvidos) && f.envolvidos.length) s += 5;
    if (Array.isArray(f?.audiencias) && f.audiencias.length) s += 2;
    return s;
  };
  return [...fontes].sort((a, b) => score(b) - score(a))[0] ?? fontes[0];
}

function extractEnvolvidos(envolvidos: any[]): {
  parteAtiva: string | null;
  partePassiva: string | null;
  advogadosPartes: any[];
  partesCompletas: any[];
} {
  if (!Array.isArray(envolvidos) || envolvidos.length === 0) {
    return { parteAtiva: null, partePassiva: null, advogadosPartes: [], partesCompletas: [] };
  }
  const ativos = envolvidos.filter((e) => e?.polo === 'ATIVO').map((e) => e.nome).filter(Boolean);
  const passivos = envolvidos.filter((e) => e?.polo === 'PASSIVO').map((e) => e.nome).filter(Boolean);
  const advogadosPartes: any[] = [];
  for (const e of envolvidos) {
    if (Array.isArray(e?.advogados)) {
      for (const a of e.advogados) {
        advogadosPartes.push({
          nome: a.nome,
          oabs: a.oabs,
          parte: e.nome,
          polo_parte: e.polo,
        });
      }
    }
  }
  return {
    parteAtiva: ativos.join(', ') || null,
    partePassiva: passivos.join(', ') || null,
    advogadosPartes,
    partesCompletas: envolvidos,
  };
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
      reparseSomente = false,
    } = await req.json();

    if (!processoId || !numeroProcesso) {
      throw new Error('processoId e numeroProcesso sao obrigatorios');
    }

    console.log('[Escavador Importar V2] 🔧 Iniciando:', numeroProcesso, '| monitoramento:', ativarMonitoramento, '| reparse:', reparseSomente);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken && !reparseSomente) {
      throw new Error('Token Escavador não configurado');
    }

    const cnjFormatado = numeroProcesso;
    const headers = {
      'Authorization': `Bearer ${escavadorToken ?? ''}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    let creditosTotal = 0;
    let proc: any;

    if (reparseSomente) {
      // Modo reparse: usar dados já salvos em processo_monitoramento_escavador
      const { data: monitExistente } = await supabaseClient
        .from('processo_monitoramento_escavador')
        .select('escavador_data')
        .eq('processo_id', processoId)
        .maybeSingle();
      proc = monitExistente?.escavador_data ?? null;
      if (!proc) {
        return Response.json(
          { success: false, message: 'Sem escavador_data em cache para reparse' },
          { headers: corsHeaders }
        );
      }
      console.log('[Escavador Importar V2] ♻️ Reparse a partir do cache');
    } else {
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
      proc = capa?.data ?? capa;
    }

    if (!proc || (!proc.numero_cnj && !proc.fontes && !proc.classe)) {
      console.error('[Escavador Importar V2] payload vazio');
      return Response.json(
        { success: false, message: 'Processo não encontrado no Escavador' },
        { headers: corsHeaders }
      );
    }

    // === EXTRAIR CAPA (com fallback em fontes[].capa) ===
    const fontes = Array.isArray(proc.fontes) ? proc.fontes : [];
    const melhorFonte = pickBestFonte(fontes);
    const fonteCapa = melhorFonte?.capa ?? {};

    const classeNome =
      pickName(proc.classe) ?? pickName(fonteCapa.classe) ?? null;
    const assuntoNome =
      pickName(proc.assunto) ??
      pickName(proc.assuntos?.[0]) ??
      pickName(fonteCapa.assunto) ??
      pickName(fonteCapa.assunto_principal_normalizado) ??
      null;
    const areaNome = pickName(proc.area) ?? pickName(fonteCapa.area) ?? null;
    const tribunalNome =
      pickName(proc.tribunal) ??
      pickName(melhorFonte?.tribunal) ??
      pickName(melhorFonte?.nome) ??
      null;
    const tribunalSigla =
      melhorFonte?.tribunal?.sigla ?? melhorFonte?.sigla ?? null;

    const valorCausaRaw =
      proc.valor_causa ?? fonteCapa.valor_causa ?? null;
    const valorCausa =
      typeof valorCausaRaw === 'object'
        ? (valorCausaRaw?.valor ?? null)
        : (valorCausaRaw ?? null);

    const dataDistribuicao =
      proc.data_inicio ??
      proc.data_distribuicao ??
      fonteCapa.data_distribuicao ??
      null;

    const juizo =
      pickName(fonteCapa.orgao_julgador) ??
      pickName(fonteCapa.orgao_julgador_normatizado) ??
      pickName(proc.orgao_julgador) ??
      null;

    const faseProcessual =
      pickName(fonteCapa.situacao) ??
      pickName(fonteCapa.fase) ??
      pickName(proc.situacao) ??
      pickName(proc.fase) ??
      null;

    const envolvidosBruto = melhorFonte?.envolvidos ?? proc.envolvidos ?? [];
    const { parteAtiva, partePassiva, advogadosPartes, partesCompletas } =
      extractEnvolvidos(envolvidosBruto);

    const escavadorIdStr = String(proc.id ?? proc.numero_cnj ?? cnjFormatado);

    const capaEstruturada = {
      classe: classeNome,
      assunto: assuntoNome,
      area: areaNome,
      tribunal: tribunalNome,
      tribunal_sigla: tribunalSigla,
      valor_causa: valorCausa,
      data_distribuicao: dataDistribuicao,
      juizo,
      fase_processual: faseProcessual,
      parte_ativa: parteAtiva,
      parte_passiva: partePassiva,
      advogados_partes: advogadosPartes,
    };

    console.log('[Escavador Importar V2] ✅ Capa:', {
      classe: classeNome,
      tribunal: tribunalNome,
      valorCausa,
      dataDistribuicao,
      juizo,
      parteAtiva,
      partePassiva,
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
      if (juizo) updates.juizo = juizo;
      if (faseProcessual) updates.fase_processual = faseProcessual;
      if (parteAtiva) updates.parte_ativa = parteAtiva;
      if (partePassiva) updates.parte_passiva = partePassiva;
      if (advogadosPartes.length) updates.advogados_partes = advogadosPartes;
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

    // === 2.2 ATUALIZAR processos_oab COM A CAPA ===
    try {
      const oabUpdates: Record<string, any> = {
        detalhes_carregados: true,
        ultima_atualizacao_detalhes: new Date().toISOString(),
        capa_completa: capaEstruturada,
      };
      if (tribunalNome) oabUpdates.tribunal = tribunalNome;
      if (tribunalSigla) oabUpdates.tribunal_sigla = tribunalSigla;
      if (parteAtiva) oabUpdates.parte_ativa = parteAtiva;
      if (partePassiva) oabUpdates.parte_passiva = partePassiva;
      if (partesCompletas.length) oabUpdates.partes_completas = partesCompletas;
      if (dataDistribuicao) oabUpdates.data_distribuicao = dataDistribuicao;
      if (valorCausa != null) oabUpdates.valor_causa = valorCausa;
      if (juizo) oabUpdates.juizo = juizo;
      if (faseProcessual) oabUpdates.fase_processual = faseProcessual;

      let q = supabaseClient
        .from('processos_oab')
        .update(oabUpdates)
        .eq('numero_cnj', cnjFormatado);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { error: oabErr } = await q;
      if (oabErr) console.error('[Escavador Importar V2] update processos_oab:', oabErr.message);
    } catch (e) {
      console.error('[Escavador Importar V2] erro update processos_oab:', e);
    }

    if (reparseSomente) {
      // Não refaz movimentações, só repreenche capa
      return Response.json(
        {
          success: true,
          reparse: true,
          andamentosInseridos: 0,
          monitoramentoAtivado: !!ativarMonitoramento,
          creditosUtilizados: 0,
          capa: capaEstruturada,
        },
        { headers: corsHeaders }
      );
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
        capa: capaEstruturada,
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