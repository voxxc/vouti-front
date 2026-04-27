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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error('Usuário inválido');

    const { loteId, jobIds } = await req.json() as {
      loteId?: string;
      jobIds?: string[];
    };

    if (!loteId && (!jobIds || jobIds.length === 0)) {
      throw new Error('Informe loteId ou jobIds');
    }

    const supabase = createClient(supabaseUrl, supabaseService);

    // Reset jobs em status de falha para pendente, zerando contadores
    let query = supabase
      .from('processo_import_jobs')
      .update({
        status: 'pendente',
        tentativas_processo: 0,
        tentativas_andamentos: 0,
        erro_mensagem: null,
        proximo_retry_em: new Date().toISOString(),
        concluido_em: null,
      })
      .in('status', ['falha_processo', 'falha_andamentos']);

    if (jobIds && jobIds.length > 0) {
      query = query.in('id', jobIds);
    } else if (loteId) {
      query = query.eq('lote_id', loteId);
    }

    const { data, error } = await query.select('id');
    if (error) throw error;

    // Reativar lote
    if (loteId) {
      await supabase
        .from('processo_import_lotes')
        .update({ status: 'em_andamento' })
        .eq('id', loteId);
    }

    return new Response(
      JSON.stringify({ success: true, reprocessados: data?.length ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[reprocessar] erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});