import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, batchSize = 50 } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se quem chamou é super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas super admins podem executar backfill' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Buscar processos sem detalhes_request_id deste tenant
    const { data: processos, error: fetchError } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, oab_id')
      .eq('tenant_id', tenantId)
      .is('detalhes_request_id', null)
      .not('numero_cnj', 'is', null)
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!processos || processos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum processo pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[Backfill] Processando ${processos.length} processos do tenant ${tenantId}`);

    let success = 0;
    let failed = 0;
    const errors: Array<{ cnj: string; error: string }> = [];

    for (const p of processos) {
      try {
        const { error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
          body: {
            processoOabId: p.id,
            numeroCnj: p.numero_cnj,
            tenantId,
            userId: user.id,
            oabId: p.oab_id,
          },
        });

        if (error) {
          failed++;
          errors.push({ cnj: p.numero_cnj!, error: error.message });
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push({ cnj: p.numero_cnj!, error: (err as Error).message });
      }

      // Delay para não estourar rate limit
      await sleep(200);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processos.length,
        success_count: success,
        failed_count: failed,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[Backfill] Erro:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
