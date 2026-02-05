import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização necessária');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar tenant_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('Tenant não encontrado para o usuário');
    }

    const tenantId = profile.tenant_id;
    console.log('[Atualizar Andamentos] Tenant:', tenantId, 'User:', user.id);

    // Buscar processos OAB do tenant que tem numero_cnj
    const { data: processos, error: processosError } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, detalhes_request_id, tracking_id')
      .eq('tenant_id', tenantId)
      .not('numero_cnj', 'is', null);

    if (processosError) {
      console.error('Erro ao buscar processos:', processosError);
      throw processosError;
    }

    if (!processos || processos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum processo encontrado para atualizar',
          processosVerificados: 0,
          processosComSucesso: 0,
          processosComErro: 0,
          andamentosAdicionados: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Atualizar Andamentos] Verificando ${processos.length} processos`);

    let totalAndamentosInseridos = 0;
    let processosComSucesso = 0;
    let processosComErro = 0;
    const erros: string[] = [];

    // Agrupar processos por CNJ para evitar consultas duplicadas
    const cnjs = [...new Set(processos.map(p => p.numero_cnj).filter(Boolean))] as string[];
    console.log(`[Atualizar Andamentos] CNJs únicos: ${cnjs.length}`);

    // Processar em lotes de 3 para evitar timeout
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < cnjs.length; i += BATCH_SIZE) {
      const lote = cnjs.slice(i, i + BATCH_SIZE);
      console.log(`[Atualizar Andamentos] Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cnjs.length / BATCH_SIZE)}`);

      const resultados = await Promise.allSettled(
        lote.map(async (cnj) => {
          const processo = processos.find(p => p.numero_cnj === cnj);
          if (!processo) return { cnj, andamentos: 0 };

          try {
            // Chamar judit-buscar-detalhes-processo
            const { data, error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
              body: {
                processoOabId: processo.id,
                numeroCnj: cnj,
                tenantId: tenantId,
                userId: user.id
              }
            });

            if (error) throw error;
            
            return {
              cnj,
              andamentos: data?.andamentosInseridos || 0
            };
          } catch (err: any) {
            throw new Error(`${cnj}: ${err.message}`);
          }
        })
      );

      // Processar resultados do lote
      resultados.forEach((resultado) => {
        if (resultado.status === 'fulfilled') {
          processosComSucesso++;
          totalAndamentosInseridos += resultado.value.andamentos;
        } else {
          processosComErro++;
          erros.push(resultado.reason.message);
        }
      });
    }

    console.log('[Atualizar Andamentos] Concluído:', {
      processosVerificados: cnjs.length,
      processosComSucesso,
      processosComErro,
      totalAndamentosInseridos
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Atualização concluída',
        processosVerificados: cnjs.length,
        processosComSucesso,
        processosComErro,
        andamentosAdicionados: totalAndamentosInseridos,
        erros: erros.length > 0 ? erros.slice(0, 5) : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na atualização de andamentos:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao atualizar andamentos'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
