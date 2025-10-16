import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessoAndamento {
  processo_id: string;
  data_movimentacao: string;
  descricao: string;
  tipo: string;
}

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

    console.log('Iniciando atualização de andamentos para o usuário:', user.id);

    // Buscar processos do usuário
    const { data: processos, error: processosError } = await supabase
      .from('processos')
      .select('id, numero_processo, tribunais(sigla)')
      .or(`created_by.eq.${user.id},advogado_responsavel_id.eq.${user.id}`);

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
          andamentosAdicionados: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verificando ${processos.length} processos`);

    let totalAndamentosInseridos = 0;
    let processosComSucesso = 0;
    let processosComErro = 0;
    const erros: string[] = [];

    // Processar em lotes de 5 para evitar timeout
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < processos.length; i += BATCH_SIZE) {
      const lote = processos.slice(i, i + BATCH_SIZE);
      
      console.log(`Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(processos.length / BATCH_SIZE)}`);

      const resultados = await Promise.allSettled(
        lote.map(async (processo) => {
          try {
            // Chamar buscar-processos-lote
            const { data, error } = await supabase.functions.invoke('buscar-processos-lote', {
              body: {
                processos: [processo.numero_processo],
                tribunal: processo.tribunais?.sigla || 'TJPR',
              },
            });

            if (error) throw error;

            const resultado = data?.processos?.[0];
            if (!resultado || !resultado.success) {
              throw new Error(resultado?.erro || 'Falha ao buscar andamentos');
            }

            // Buscar movimentações existentes
            const { data: existentes } = await supabase
              .from('processo_movimentacoes')
              .select('descricao, data_movimentacao')
              .eq('processo_id', processo.id);

            // Deduplicação
            const existentesSet = new Set(
              existentes?.map(m => {
                const normDesc = m.descricao.trim().replace(/\s+/g, ' ').toLowerCase();
                const dateKey = new Date(m.data_movimentacao).toISOString().slice(0, 10);
                return `${normDesc}|${dateKey}`;
              }) || []
            );

            const novasMovimentacoes = resultado.movimentacoes.filter(mov => {
              const normDesc = mov.descricao.trim().replace(/\s+/g, ' ').toLowerCase();
              const dateKey = new Date(mov.data).toISOString().slice(0, 10);
              const key = `${normDesc}|${dateKey}`;
              return !existentesSet.has(key);
            });

            // Inserir novas movimentações
            if (novasMovimentacoes.length > 0) {
              const movimentacoesParaInserir = novasMovimentacoes.map(mov => ({
                processo_id: processo.id,
                tipo: mov.tipo || 'intimacao',
                data_movimentacao: new Date(mov.data).toISOString(),
                descricao: mov.descricao,
                is_automated: true,
                status_conferencia: 'pendente',
                metadata: {
                  fonte: resultado.fonte,
                  sequencia: mov.sequencia,
                  texto_completo: mov.texto_completo,
                  atualizado_em: new Date().toISOString(),
                },
              }));

              const { error: insertError } = await supabase
                .from('processo_movimentacoes')
                .insert(movimentacoesParaInserir);

              if (insertError) throw insertError;
            }

            return {
              processoId: processo.id,
              numeroProcesso: processo.numero_processo,
              novasMovimentacoes: novasMovimentacoes.length,
              fonte: resultado.fonte
            };
          } catch (error) {
            throw new Error(`${processo.numero_processo}: ${error.message}`);
          }
        })
      );

      // Processar resultados do lote
      resultados.forEach((resultado, idx) => {
        if (resultado.status === 'fulfilled') {
          processosComSucesso++;
          totalAndamentosInseridos += resultado.value.novasMovimentacoes;
        } else {
          processosComErro++;
          erros.push(resultado.reason.message);
        }
      });
    }

    console.log('Atualização concluída:', {
      processosVerificados: processos.length,
      processosComSucesso,
      processosComErro,
      totalAndamentosInseridos
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Atualização concluída`,
        processosVerificados: processos.length,
        processosComSucesso,
        processosComErro,
        andamentosAdicionados: totalAndamentosInseridos,
        erros: erros.length > 0 ? erros.slice(0, 5) : undefined // Máximo 5 erros
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
