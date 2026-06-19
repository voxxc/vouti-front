import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoOabId, requestIdOverride } = await req.json();
    if (!processoOabId) throw new Error('processoOabId é obrigatório');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: processo, error: procErr } = await supabase
      .from('processos_oab')
      .select('id, oab_id, tenant_id, numero_cnj, detalhes_request_id, parte_ativa, parte_passiva')
      .eq('id', processoOabId)
      .single();
    if (procErr || !processo) throw new Error('Processo não encontrado');

    const requestId = requestIdOverride || processo.detalhes_request_id;
    if (!requestId) {
      throw new Error('Sem request_id salvo para este processo. Use a importação normal.');
    }

    if (requestIdOverride && requestIdOverride !== processo.detalhes_request_id) {
      await supabase
        .from('processos_oab')
        .update({ detalhes_request_id: requestIdOverride })
        .eq('id', processoOabId);
    }

    console.log('[Judit Rebuscar] processo:', processoOabId, 'request_id:', requestId);

    const { data: logData } = await supabase
      .from('judit_api_logs')
      .insert({
        tenant_id: processo.tenant_id || null,
        oab_id: processo.oab_id,
        tipo_chamada: 'lawsuit_cnj_refetch_responses',
        endpoint: `https://requests.prod.judit.io/responses?request_id=${requestId}`,
        metodo: 'GET',
        request_payload: { request_id: requestId, processoOabId },
        sucesso: false,
        custo_estimado: 0,
        request_id: requestId,
      })
      .select('id')
      .single();
    const logId = logData?.id;

    const resp = await fetch(
      `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
      {
        method: 'GET',
        headers: {
          'api-key': juditApiKey.trim(),
          'Content-Type': 'application/json',
        },
      },
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      if (logId) {
        await supabase.from('judit_api_logs').update({
          sucesso: false,
          resposta_status: resp.status,
          erro_mensagem: errorText,
        }).eq('id', logId);
      }
      throw new Error(`Erro Judit GET /responses: ${resp.status}`);
    }

    const data = await resp.json();
    const pageData: any[] = data.page_data || [];
    console.log('[Judit Rebuscar] page_data items:', pageData.length);
    console.log('[Judit Rebuscar] request_status:', data.request_status);
    if (pageData[0]) {
      const d0 = pageData[0].response_data || pageData[0];
      console.log('[Judit Rebuscar] item0 keys:', Object.keys(d0).join(','));
      console.log('[Judit Rebuscar] item0 response_type:', pageData[0].response_type);
      console.log('[Judit Rebuscar] item0 response_data sample:', JSON.stringify(d0).slice(0, 800));
    }

    // Achar o primeiro item com steps
    let responseData: any = null;
    let steps: any[] = [];
    for (const item of pageData) {
      const d = item.response_data || item;
      const s =
        d.steps || d.movements || d.andamentos || d.history || d.last_steps || [];
      if (Array.isArray(s) && s.length > 0) {
        responseData = d;
        steps = s;
        break;
      }
      if (!responseData && d) responseData = d; // capa fallback
    }

    let andamentosInseridos = 0;
    let duplicadosIgnorados = 0;

    for (const step of steps) {
      const dataMovimentacao = step.step_date || step.date || step.data || step.created_at;
      const descricao = step.content || step.description || step.descricao || step.text || '';
      const tipoMovimentacao = step.type || step.tipo || step.step_type || null;
      if (!descricao) continue;

      const { error } = await supabase
        .from('processos_oab_andamentos')
        .insert({
          processo_oab_id: processoOabId,
          tenant_id: processo.tenant_id,
          data_movimentacao: dataMovimentacao,
          tipo_movimentacao: tipoMovimentacao,
          descricao,
          dados_completos: step,
          lida: false,
        });

      if (!error) {
        andamentosInseridos++;
      } else if ((error as any).code === '23505') {
        duplicadosIgnorados++;
      } else {
        console.error('[Judit Rebuscar] insert err:', error.message);
      }
    }

    // Se a resposta agora trouxe capa rica e o processo não tinha partes, atualiza
    if (responseData && (!processo.parte_ativa || processo.parte_ativa.startsWith('('))) {
      const parties: any[] = responseData.parties || [];
      const autores = parties.filter((p) => {
        const side = (p.side || '').toLowerCase();
        const tipo = (p.person_type || '').toUpperCase();
        return side === 'active' || side === 'plaintiff' || side === 'author' ||
          tipo.includes('ATIVO') || tipo.includes('AUTOR') || tipo.includes('REQUERENTE') || tipo.includes('EXEQUENTE');
      }).map((p) => p.name || p.nome).filter(Boolean);
      const reus = parties.filter((p) => {
        const side = (p.side || '').toLowerCase();
        const tipo = (p.person_type || '').toUpperCase();
        return side === 'passive' || side === 'defendant' ||
          tipo.includes('PASSIVO') || tipo.includes('REU') || tipo.includes('RÉU') || tipo.includes('REQUERIDO') || tipo.includes('EXECUTADO');
      }).map((p) => p.name || p.nome).filter(Boolean);

      const tribunalInfo = responseData.courts?.[0] || {};
      const updates: Record<string, any> = {
        capa_completa: responseData,
        detalhes_completos: responseData,
        detalhes_carregados: true,
      };
      if (autores.length > 0) updates.parte_ativa = autores.join(' e ');
      if (reus.length > 0) updates.parte_passiva = reus.join(' e ');
      if (tribunalInfo.name) updates.tribunal = tribunalInfo.name;
      if (tribunalInfo.acronym) updates.tribunal_sigla = tribunalInfo.acronym;

      await supabase.from('processos_oab').update(updates).eq('id', processoOabId);
    }

    if (logId) {
      await supabase.from('judit_api_logs').update({
        sucesso: true,
        resposta_status: 200,
      }).eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processoId: processoOabId,
        requestId,
        totalSteps: steps.length,
        andamentosInseridos,
        duplicadosIgnorados,
        mensagem: steps.length === 0
          ? 'Nenhum andamento disponível na Judit para este request_id.'
          : `${andamentosInseridos} novo(s) andamento(s) importado(s).`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[Judit Rebuscar] erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});