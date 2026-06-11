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
    const { processoId, numeroProcesso, tenantId } = await req.json();
    
    if (!processoId || !numeroProcesso) {
      throw new Error('processoId e numeroProcesso sao obrigatorios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const numeroLimpo = numeroProcesso.replace(/\D/g, '');
    console.log('[Judit] Ativando monitoramento para:', numeroLimpo);

    // Buscar credencial vinculada ao processo (definida na importação ou
    // ajustada manualmente no drawer). Fallback: primeira credencial ativa do tenant.
    let customerKey: string | null = null;
    let systemNameUsado: string | null = null;
    const effectiveTenantId = tenantId || null;

    // 1) Snapshot salvo no próprio processo
    const { data: processoRow } = await supabase
      .from('processos_oab')
      .select('judit_customer_key, judit_system_name')
      .eq('id', processoId)
      .maybeSingle();

    if (processoRow?.judit_customer_key) {
      customerKey = processoRow.judit_customer_key;
      systemNameUsado = processoRow.judit_system_name || null;
      console.log('[Judit] Usando credencial vinculada ao processo:', systemNameUsado);
    }

    // 2) Fallback histórico (mantém comportamento anterior se nenhum snapshot)
    if (!customerKey && effectiveTenantId) {
      const { data: credenciais } = await supabase
        .from('credenciais_judit')
        .select('customer_key, system_name')
        .eq('tenant_id', effectiveTenantId)
        .eq('status', 'active');
      
      if (credenciais && credenciais.length > 0) {
        customerKey = credenciais[0].customer_key;
        systemNameUsado = credenciais[0].system_name;
        console.log('[Judit] Usando credencial do cofre:', customerKey, '- sistema:', credenciais[0].system_name);
      }
    }

    // URL do webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/judit-webhook`;

    // Criar tracking na Judit (COM credencial para processos sigilosos)
    // IMPORTANTE: credencial vai em search.search_params.credential (formato oficial Judit).
    const trackingBody: any = {
      recurrence: 1,
      search: {
        search_type: 'lawsuit_cnj',
        search_key: numeroLimpo,
      },
      callback_url: webhookUrl,
      with_attachments: false,
    };

    if (customerKey) {
      trackingBody.search.search_params = { credential: { customer_key: customerKey } };
      console.log('[Judit] Tracking criado COM credencial para acesso a processos sigilosos');
    }

    const trackingResponse = await fetch('https://tracking.prod.judit.io/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey,
      },
      body: JSON.stringify(trackingBody),
    });

    if (!trackingResponse.ok) {
      const error = await trackingResponse.text();
      console.error('[Judit] Erro ao criar tracking:', error);
      throw new Error(`Erro ao ativar monitoramento: ${trackingResponse.status}`);
    }

    const trackingData = await trackingResponse.json();
    const trackingId = trackingData.tracking_id;

    console.log('[Judit] Tracking ID:', trackingId);

    // Atualizar monitoramento no banco
    const { error: updateError } = await supabase
      .from('processo_monitoramento_judit')
      .update({
        tracking_id: trackingId,
        monitoramento_ativo: true,
        recurrence: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('processo_id', processoId);

    if (updateError) {
      console.error('[Judit] Erro ao atualizar monitoramento:', updateError);
      throw updateError;
    }

    console.log('[Judit] Monitoramento ativado com sucesso');

    // Sincronizar processos_oab (caso tenha sido zerado em desativação anterior)
    await supabase
      .from('processos_oab')
      .update({ monitoramento_ativo: true, tracking_id: trackingId, with_attachments: false })
      .eq('id', processoId);

    // Registrar em tenant_banco_ids (tipo='tracking')
    if (effectiveTenantId) {
      // Remover entry de tracking_desativado para esse tracking_id se existir
      await supabase
        .from('tenant_banco_ids')
        .delete()
        .eq('tenant_id', effectiveTenantId)
        .eq('tipo', 'tracking_desativado')
        .eq('external_id', trackingId);

      // Verificar se já existe (UPSERT manual)
      const { data: existing } = await supabase
        .from('tenant_banco_ids')
        .select('id')
        .eq('tenant_id', effectiveTenantId)
        .eq('tipo', 'tracking')
        .eq('external_id', trackingId)
        .maybeSingle();

      const payload = {
        tenant_id: effectiveTenantId,
        tipo: 'tracking',
        referencia_id: processoId,
        external_id: trackingId,
        descricao: `Tracking ativo - CNJ ${numeroProcesso}`,
        metadata: {
          tracking_id: trackingId,
          processo_oab_id: processoId,
          numero_cnj: numeroProcesso,
          ativado_em: new Date().toISOString(),
          recurrence: 1,
          com_credencial: !!customerKey,
          system_name: systemNameUsado,
        },
      };

      if (existing) {
        await supabase.from('tenant_banco_ids').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('tenant_banco_ids').insert(payload);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackingId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
