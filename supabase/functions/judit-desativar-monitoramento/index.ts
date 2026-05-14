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
    const { processoId } = await req.json();
    
    if (!processoId) {
      throw new Error('processoId e obrigatorio');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Judit] Desativando monitoramento para processo:', processoId);

    // Buscar tracking_id e tenant
    const { data: monitoramento, error: fetchError } = await supabase
      .from('processo_monitoramento_judit')
      .select('tracking_id, tenant_id')
      .eq('processo_id', processoId)
      .single();

    if (fetchError || !monitoramento?.tracking_id) {
      throw new Error('Monitoramento nao encontrado');
    }

    const trackingId = monitoramento.tracking_id;
    const tenantId = monitoramento.tenant_id;

    // Pausar tracking na Judit
    const pauseResponse = await fetch(`https://tracking.prod.judit.io/tracking/${trackingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey,
      },
      body: JSON.stringify({
        status: 'paused',
      }),
    });

    if (!pauseResponse.ok) {
      const error = await pauseResponse.text();
      console.error('[Judit] Erro ao pausar tracking:', error);
      throw new Error(`Erro ao desativar monitoramento: ${pauseResponse.status}`);
    }

    console.log('[Judit] Tracking pausado na Judit');

    // Atualizar status no banco (mantem historico)
    const { error: updateError } = await supabase
      .from('processo_monitoramento_judit')
      .update({
        monitoramento_ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('processo_id', processoId);

    if (updateError) {
      console.error('[Judit] Erro ao atualizar status:', updateError);
      throw updateError;
    }

    console.log('[Judit] Monitoramento desativado com sucesso');

    // Atualizar tenant_banco_ids: mover para tracking_desativado
    if (tenantId) {
      // Buscar CNJ
      const { data: proc } = await supabase
        .from('processos_oab')
        .select('numero_cnj')
        .eq('id', processoId)
        .single();
      const numeroCnj = proc?.numero_cnj || '';

      await supabase
        .from('tenant_banco_ids')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('tipo', 'tracking')
        .eq('external_id', trackingId);

      const { data: existingDesat } = await supabase
        .from('tenant_banco_ids')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'tracking_desativado')
        .eq('external_id', trackingId)
        .maybeSingle();

      const payload = {
        tenant_id: tenantId,
        tipo: 'tracking_desativado',
        referencia_id: processoId,
        external_id: trackingId,
        descricao: `Tracking desativado - CNJ ${numeroCnj}`,
        metadata: {
          tracking_id: trackingId,
          processo_oab_id: processoId,
          numero_cnj: numeroCnj,
          desativado_em: new Date().toISOString(),
          motivo: 'desativacao_manual',
        },
      };

      if (existingDesat) {
        await supabase.from('tenant_banco_ids').update(payload).eq('id', existingDesat.id);
      } else {
        await supabase.from('tenant_banco_ids').insert(payload);
      }

      await supabase
        .from('processos_oab')
        .update({ monitoramento_ativo: false, tracking_id: null, tracking_request_id: null })
        .eq('id', processoId);
    }

    return new Response(
      JSON.stringify({ success: true }),
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
