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
      .select('id, numero_processo')
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

    // Array para armazenar novos andamentos
    const novosAndamentos: ProcessoAndamento[] = [];

    // Simular busca de andamentos (aqui você integraria com API do PJE/tribunal)
    // Por ora, vamos criar andamentos de exemplo para demonstração
    for (const processo of processos) {
      // IMPORTANTE: Aqui você deve integrar com a API do PJE ou tribunal
      // Exemplo de integração futura:
      // const andamentos = await buscarAndamentosPJE(processo.numero_processo);
      
      // Por enquanto, vamos simular verificando se há andamentos recentes
      const { data: ultimaMovimentacao } = await supabase
        .from('processo_movimentacoes')
        .select('data_movimentacao')
        .eq('processo_id', processo.id)
        .order('data_movimentacao', { ascending: false })
        .limit(1)
        .single();

      // Simulação: adicionar andamento apenas se não houver movimentação nas últimas 24h
      // Em produção, isso seria substituído pela integração real com PJE
      const agora = new Date();
      const ultimaData = ultimaMovimentacao?.data_movimentacao 
        ? new Date(ultimaMovimentacao.data_movimentacao)
        : new Date(0);
      
      const diferencaHoras = (agora.getTime() - ultimaData.getTime()) / (1000 * 60 * 60);
      
      // Simular que há novos andamentos se passou mais de 24h
      if (diferencaHoras > 24) {
        novosAndamentos.push({
          processo_id: processo.id,
          data_movimentacao: new Date().toISOString(),
          descricao: `Andamento automático - Processo ${processo.numero_processo} verificado`,
          tipo: 'outros'
        });
      }
    }

    console.log(`${novosAndamentos.length} novos andamentos encontrados`);

    // Inserir novos andamentos
    let andamentosInseridos = 0;
    
    for (const andamento of novosAndamentos) {
      const { error: insertError } = await supabase
        .from('processo_movimentacoes')
        .insert({
          processo_id: andamento.processo_id,
          tipo: andamento.tipo,
          data_movimentacao: andamento.data_movimentacao,
          descricao: andamento.descricao,
          is_automated: true,
          status_conferencia: 'pendente',
          metadata: {
            fonte: 'push_automatico',
            atualizado_em: new Date().toISOString(),
            user_id: user.id
          }
        });

      if (!insertError) {
        andamentosInseridos++;
      } else {
        console.error('Erro ao inserir andamento:', insertError);
      }
    }

    console.log('Atualização concluída');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Atualização concluída com sucesso`,
        processosVerificados: processos.length,
        andamentosAdicionados: andamentosInseridos
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
