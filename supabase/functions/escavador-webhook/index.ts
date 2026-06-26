import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-escavador-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    // Kill switch global
    const enabled = (Deno.env.get('ESCAVADOR_WEBHOOKS_ENABLED') ?? 'true').toLowerCase();
    if (enabled === 'false' || enabled === '0' || enabled === 'off') {
      console.log('[Escavador Webhook] Desativado via ESCAVADOR_WEBHOOKS_ENABLED');
      return new Response(
        JSON.stringify({ success: false, disabled: true }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validação de webhook secret (se configurado)
    const webhookSecret = Deno.env.get('ESCAVADOR_WEBHOOK_SECRET');
    if (webhookSecret) {
      const provided =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('x-escavador-secret');
      if (provided !== webhookSecret) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    const payload = await req.json();
    console.log('[Escavador Webhook] Recebido:', JSON.stringify(payload).substring(0, 500));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const escavadorIdentifier = String(
      payload.processo_id ?? payload.id ?? payload?.processo?.id ?? ''
    );
    const numeroCnj: string | undefined =
      payload.numero_cnj || payload?.processo?.numero_cnj || payload?.valor;
    const monitoramentoIdPayload = String(
      payload.monitoramento_id ?? payload?.monitoramento?.id ?? ''
    );

    // === Caminho OAB (novo) ===
    let oabRow: any = null;
    if (escavadorIdentifier) {
      const { data } = await supabaseClient
        .from('processo_oab_monitoramento_escavador')
        .select('id, processo_oab_id, tenant_id, total_atualizacoes')
        .eq('escavador_id', escavadorIdentifier)
        .maybeSingle();
      oabRow = data;
    }
    if (!oabRow && monitoramentoIdPayload) {
      const { data } = await supabaseClient
        .from('processo_oab_monitoramento_escavador')
        .select('id, processo_oab_id, tenant_id, total_atualizacoes')
        .eq('monitoramento_id', monitoramentoIdPayload)
        .maybeSingle();
      oabRow = data;
    }
    if (!oabRow && numeroCnj) {
      const { data } = await supabaseClient
        .from('processo_oab_monitoramento_escavador')
        .select('id, processo_oab_id, tenant_id, total_atualizacoes')
        .eq('numero_cnj', numeroCnj)
        .eq('monitoramento_ativo', true)
        .maybeSingle();
      oabRow = data;
    }

    if (oabRow) {
      const movs: any[] = Array.isArray(payload.movimentacoes)
        ? payload.movimentacoes
        : Array.isArray(payload.itens)
          ? payload.itens
          : [payload];

      let inseridos = 0;
      for (const mov of movs) {
        const descricao = mov?.conteudo || mov?.descricao || mov?.texto || 'Sem descrição';
        const dataMov = mov?.data || mov?.data_evento || new Date().toISOString();
        const hashSrc = `${oabRow.processo_oab_id}|${(descricao || '').trim().slice(0, 200)}|${(dataMov || '').slice(0, 19)}`;
        let h = 0;
        for (let i = 0; i < hashSrc.length; i++) {
          h = ((h << 5) - h) + hashSrc.charCodeAt(i);
          h |= 0;
        }
        const dedup = `esc_${Math.abs(h)}`;

        const { error: insErr } = await supabaseClient
          .from('processos_oab_andamentos')
          .insert({
            processo_oab_id: oabRow.processo_oab_id,
            tenant_id: oabRow.tenant_id,
            data_movimentacao: dataMov,
            tipo_movimentacao: mov?.tipo || mov?.evento || 'movimentacao',
            descricao,
            dados_completos: { ...mov, _origem: 'escavador' },
            lida: false,
            dedup_hash: dedup,
          });
        if (!insErr) inseridos++;
      }

      await supabaseClient
        .from('processo_oab_monitoramento_escavador')
        .update({
          ultima_atualizacao: new Date().toISOString(),
          total_atualizacoes: (oabRow.total_atualizacoes || 0) + inseridos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', oabRow.id);

      console.log(`[Escavador Webhook] OAB: ${inseridos} andamentos inseridos`);
      return new Response(
        JSON.stringify({ success: true, fluxo: 'oab', inseridos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Buscar o monitoramento pelo escavador_id
    const { data: monitoramento, error: fetchError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .select('processo_id, id')
      .eq('escavador_id', payload.processo_id || payload.id)
      .maybeSingle();

    if (fetchError || !monitoramento) {
      console.error('[Escavador Webhook] Processo não encontrado:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Processo não encontrado' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar atualização
    const { error: insertError } = await supabaseClient
      .from('processo_atualizacoes_escavador')
      .insert({
        processo_id: monitoramento.processo_id,
        monitoramento_id: monitoramento.id,
        tipo_atualizacao: payload.tipo || payload.evento || 'movimentacao',
        descricao: payload.descricao || payload.texto || payload.conteudo,
        data_evento: payload.data || payload.data_evento || new Date().toISOString(),
        dados_completos: payload,
        lida: false,
        notificacao_enviada: false
      });

    if (insertError) {
      console.error('[Escavador Webhook] Erro ao inserir atualização:', insertError);
      throw insertError;
    }

    // Atualizar contadores no monitoramento (lê → incrementa → grava)
    const { data: monRow } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .select('total_atualizacoes')
      .eq('id', monitoramento.id)
      .maybeSingle();
    const { error: updateError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .update({
        ultima_atualizacao: new Date().toISOString(),
        total_atualizacoes: ((monRow as any)?.total_atualizacoes || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', monitoramento.id);

    if (updateError) {
      console.error('[Escavador Webhook] Erro ao atualizar contadores:', updateError);
    }

    console.log('[Escavador Webhook] Atualização registrada com sucesso');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Escavador Webhook] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
