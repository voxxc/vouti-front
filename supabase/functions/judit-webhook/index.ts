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
    const payload = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const trackingId = payload.reference_id;
    
    if (!trackingId) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: monitoramento, error: fetchError } = await supabase
      .from('processo_monitoramento_judit')
      .select('id, processo_id')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError || !monitoramento) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = payload.payload?.response_data;
    
    if (!responseData || !responseData.steps) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const steps = responseData.steps;

    const { data: existingAndamentos } = await supabase
      .from('processo_andamentos_judit')
      .select('dados_completos')
      .eq('processo_id', monitoramento.processo_id);

    const existingStepIds = new Set(
      (existingAndamentos || []).map(a => {
        const stepData = a.dados_completos as any;
        return stepData?.step_number || stepData?.id;
      }).filter(Boolean)
    );

    let newCount = 0;

    for (const step of steps) {
      const stepId = step.step_number || step.id;
      
      if (!existingStepIds.has(stepId)) {
        const { error: insertError } = await supabase
          .from('processo_andamentos_judit')
          .insert({
            processo_id: monitoramento.processo_id,
            monitoramento_id: monitoramento.id,
            tipo_movimentacao: step.step_type || 'Movimentação',
            descricao: step.step_description || step.content || 'Sem descrição',
            data_movimentacao: step.step_date || new Date().toISOString(),
            dados_completos: step,
            lida: false,
          });

        if (!insertError) {
          newCount++;
        } else {
          console.error('Error inserting andamento');
        }
      }
    }

    if (newCount > 0) {
      const { data: currentMon } = await supabase
        .from('processo_monitoramento_judit')
        .select('total_movimentacoes')
        .eq('id', monitoramento.id)
        .single();

      const totalAtual = currentMon?.total_movimentacoes || 0;

      await supabase
        .from('processo_monitoramento_judit')
        .update({
          total_movimentacoes: totalAtual + newCount,
          ultima_atualizacao: new Date().toISOString(),
          judit_data: responseData,
        })
        .eq('id', monitoramento.id);
    }

    return new Response(
      JSON.stringify({ success: true, newMovements: newCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in judit-webhook');
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
