import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ESCAVADOR_BASE = 'https://api.escavador.com';

function tribunalSiglaFromCnj(cnj: string): string {
  const match = cnj.match(/^\d{7}-?\d{2}\.?\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!match) return '';
  const segmento = match[1];
  const codigo = match[2];
  if (segmento === '8') {
    const map: Record<string, string> = {
      '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '04': 'TJAM', '05': 'TJBA',
      '06': 'TJCE', '07': 'TJDFT', '08': 'TJES', '09': 'TJGO', '10': 'TJMA',
      '11': 'TJMT', '12': 'TJMS', '13': 'TJMG', '14': 'TJPA', '15': 'TJPB',
      '16': 'TJPR', '17': 'TJPE', '18': 'TJPI', '19': 'TJRJ', '20': 'TJRN',
      '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC', '25': 'TJSE',
      '26': 'TJSP', '27': 'TJTO',
    };
    return map[codigo] || '';
  }
  if (segmento === '4') return `TRF${parseInt(codigo, 10)}`;
  if (segmento === '5') return `TRT${parseInt(codigo, 10)}`;
  if (segmento === '1') return 'STF';
  if (segmento === '3') return 'STJ';
  if (segmento === '2') return 'CNJ';
  return '';
}

function dedupHash(processoOabId: string, descricao: string, data: string): string {
  const s = `${processoOabId}|${(descricao || '').trim().slice(0, 200)}|${(data || '').slice(0, 19)}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return `esc_${Math.abs(h)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { processoOabId, numeroCnj, tenantId } = await req.json();
    if (!processoOabId || !numeroCnj) {
      throw new Error('processoOabId e numeroCnj sao obrigatorios');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Feature flag global
    const { data: flag } = await supabase
      .from('super_admin_feature_flags')
      .select('enabled')
      .eq('flag_key', 'escavador_monitoramento_enabled')
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Funcionalidade desativada pelo administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!token) throw new Error('ESCAVADOR_API_TOKEN nao configurado');

    // Buscar processo OAB para garantir tenant
    const { data: processo, error: procErr } = await supabase
      .from('processos_oab')
      .select('id, tenant_id, numero_cnj, tribunal_sigla')
      .eq('id', processoOabId)
      .single();
    if (procErr || !processo) throw new Error('Processo OAB nao encontrado');

    const finalTenantId = processo.tenant_id || tenantId;
    const cnj = processo.numero_cnj || numeroCnj;

    // 1) Buscar dados V2 (síncrono, dados estruturados)
    let processoV2: any = null;
    let movimentacoes: any[] = [];
    try {
      const r = await fetch(`${ESCAVADOR_BASE}/api/v2/processos/numero_cnj/${encodeURIComponent(cnj)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (r.ok) {
        processoV2 = await r.json();
      } else {
        console.log('[escavador-ativar-oab] V2 process not found:', r.status);
      }
    } catch (e) {
      console.error('[escavador-ativar-oab] V2 process fetch error:', e);
    }

    if (processoV2) {
      try {
        const rm = await fetch(
          `${ESCAVADOR_BASE}/api/v2/processos/numero_cnj/${encodeURIComponent(cnj)}/movimentacoes?limit=50`,
          { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } },
        );
        if (rm.ok) {
          const j = await rm.json();
          movimentacoes = j?.items || j?.data || [];
        }
      } catch (e) {
        console.error('[escavador-ativar-oab] V2 movimentacoes error:', e);
      }
    }

    // 2) Criar monitoramento V1 com frequencia SEMANAL
    const tribunal =
      (processoV2?.tribunal?.sigla || processo.tribunal_sigla || tribunalSiglaFromCnj(cnj) || '').toUpperCase();

    let monitoramentoId: string | null = null;
    if (tribunal) {
      try {
        const rMon = await fetch(`${ESCAVADOR_BASE}/api/v1/monitoramento-tribunal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            tipo: 'unico',
            valor: cnj,
            tribunal,
            frequencia: 'semanal',
          }),
        });
        const txt = await rMon.text();
        if (rMon.ok) {
          try {
            const parsed = JSON.parse(txt);
            monitoramentoId = String(parsed?.id ?? parsed?.data?.id ?? '') || null;
          } catch { /* ignore */ }
          console.log('[escavador-ativar-oab] monitoramento criado:', monitoramentoId);
        } else {
          console.error('[escavador-ativar-oab] erro criar monitoramento:', rMon.status, txt);
        }
      } catch (e) {
        console.error('[escavador-ativar-oab] exception criar monitoramento:', e);
      }
    } else {
      console.warn('[escavador-ativar-oab] tribunal não derivado do CNJ; monitoramento nao registrado');
    }

    // 3) Persistir tabela de monitoramento OAB
    const escavadorId = processoV2?.id ? String(processoV2.id) : null;
    const { error: upErr } = await supabase
      .from('processo_oab_monitoramento_escavador')
      .upsert({
        processo_oab_id: processoOabId,
        tenant_id: finalTenantId,
        numero_cnj: cnj,
        escavador_id: escavadorId,
        monitoramento_id: monitoramentoId,
        frequencia: 'semanal',
        monitoramento_ativo: true,
        escavador_data: processoV2 || null,
        ultima_consulta: new Date().toISOString(),
      }, { onConflict: 'processo_oab_id' });
    if (upErr) throw upErr;

    // 4) Inserir andamentos iniciais em processos_oab_andamentos (não-lidos)
    let totalSalvos = 0;
    for (const mov of movimentacoes) {
      const descricao = mov?.conteudo || mov?.descricao || mov?.texto || 'Sem descrição';
      const dataMov = mov?.data || mov?.data_evento || null;
      const hash = dedupHash(processoOabId, descricao, dataMov || '');
      const { error: insErr } = await supabase
        .from('processos_oab_andamentos')
        .insert({
          processo_oab_id: processoOabId,
          tenant_id: finalTenantId,
          data_movimentacao: dataMov,
          tipo_movimentacao: mov?.tipo || mov?.classificacao || 'movimentacao',
          descricao,
          dados_completos: { ...mov, _origem: 'escavador' },
          lida: false,
          dedup_hash: hash,
        });
      if (!insErr) totalSalvos++;
    }

    // 5) Refletir no processos_oab
    await supabase
      .from('processos_oab')
      .update({ monitoramento_ativo: true, updated_at: new Date().toISOString() })
      .eq('id', processoOabId);

    return new Response(
      JSON.stringify({
        success: true,
        monitoramentoId,
        escavadorId,
        totalAndamentos: totalSalvos,
        processoEncontrado: !!processoV2,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[escavador-ativar-oab] erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});