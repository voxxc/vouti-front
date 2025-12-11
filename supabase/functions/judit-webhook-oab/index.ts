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
    
    console.log('[Judit Webhook OAB] Payload recebido:', JSON.stringify(payload).substring(0, 500));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair tracking_id do payload
    const trackingId = payload.tracking_id;
    
    if (!trackingId) {
      console.error('[Judit Webhook OAB] tracking_id nao encontrado no payload');
      return new Response(
        JSON.stringify({ success: false, error: 'tracking_id ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar processo pelo tracking_id COM tenant_id
    const { data: processo, error: fetchError } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, tenant_id')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError || !processo) {
      console.error('[Judit Webhook OAB] Processo nao encontrado para tracking_id:', trackingId);
      return new Response(
        JSON.stringify({ success: false, error: 'Processo nao encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook OAB] Processo encontrado:', processo.numero_cnj);

    // Extrair novos andamentos do payload
    const responseData = payload.response_data || payload.data || payload;
    const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

    console.log('[Judit Webhook OAB] Andamentos no payload:', steps.length);

    if (steps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum andamento novo', novosAndamentos: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar andamentos existentes
    const { data: existingAndamentos } = await supabase
      .from('processos_oab_andamentos')
      .select('descricao, data_movimentacao')
      .eq('processo_oab_id', processo.id);

    const existingKeys = new Set(
      (existingAndamentos || []).map(a => `${a.data_movimentacao}_${a.descricao?.substring(0, 50)}`)
    );

    // Inserir novos andamentos
    let novosAndamentos = 0;
    for (const step of steps) {
      const dataMovimentacao = step.date || step.data || step.data_movimentacao;
      const descricao = step.description || step.descricao || step.content || '';
      
      const key = `${dataMovimentacao}_${descricao.substring(0, 50)}`;
      
      if (!existingKeys.has(key) && descricao) {
        const { error } = await supabase
          .from('processos_oab_andamentos')
          .insert({
            processo_oab_id: processo.id,
            tenant_id: processo.tenant_id,
            data_movimentacao: dataMovimentacao,
            tipo_movimentacao: step.type || step.tipo || null,
            descricao: descricao,
            dados_completos: step,
            lida: false
          });

        if (!error) {
          novosAndamentos++;
        }
      }
    }

    // Atualizar processo com timestamp da ultima atualizacao
    if (novosAndamentos > 0) {
      await supabase
        .from('processos_oab')
        .update({
          ultima_atualizacao_detalhes: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', processo.id);
    }

    console.log('[Judit Webhook OAB] Novos andamentos inseridos:', novosAndamentos);

    return new Response(
      JSON.stringify({ success: true, novosAndamentos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Webhook OAB] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
