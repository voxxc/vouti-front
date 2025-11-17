import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log('[Escavador Webhook] Recebido:', JSON.stringify(payload).substring(0, 500));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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

    // Atualizar contadores no monitoramento
    const { error: updateError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .update({
        ultima_atualizacao: new Date().toISOString(),
        total_atualizacoes: supabaseClient.rpc('increment'),
        updated_at: new Date().toISOString()
      })
      .eq('id', monitoramento.id);

    if (updateError) {
      console.error('[Escavador Webhook] Erro ao atualizar contadores:', updateError);
    }

    console.log('[Escavador Webhook] Atualização registrada com sucesso');

    // === CRIAR NOTIFICAÇÃO PARA ADVOGADO RESPONSÁVEL ===
    const { data: processo } = await supabaseClient
      .from('processos')
      .select('numero_processo, advogado_responsavel_id')
      .eq('id', monitoramento.processo_id)
      .single();

    if (processo?.advogado_responsavel_id) {
      await supabaseClient.from('notifications').insert({
        user_id: processo.advogado_responsavel_id,
        type: 'processo_movimentacao',
        title: `🔔 Nova movimentação: ${processo.numero_processo}`,
        content: (payload.descricao || payload.texto || payload.conteudo || '').substring(0, 200),
        related_project_id: monitoramento.processo_id,
        triggered_by_user_id: processo.advogado_responsavel_id
      });

      console.log('[Escavador Webhook] ✅ Notificação criada para advogado');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Escavador Webhook] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
