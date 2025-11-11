import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoId, numeroProcesso } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      throw new Error('Token Escavador não configurado');
    }

    console.log(`[Escavador] Consultando processo: ${numeroProcesso}`);

    // Função para tentar múltiplos formatos do número
    const formatarNumeroProcesso = (numero: string): string[] => {
      const limpo = numero.replace(/\D/g, '');
      return [
        numero, // Original (0002532-58.2025.8.16.0192)
        limpo, // Sem formatação (00025325820258160192)
        numero.replace(/-/g, '.'), // Com pontos
      ];
    };

    // Tentar múltiplos formatos
    const formatos = formatarNumeroProcesso(numeroProcesso);
    let processoEncontrado = null;
    let formatoUtilizado = '';

    for (const formato of formatos) {
      console.log(`[Escavador] Tentando formato: ${formato}`);
      
      const url = new URL('https://api.escavador.com/api/v1/busca');
      url.searchParams.append('q', formato);
      url.searchParams.append('qo', 'processos');
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${escavadorToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[Escavador] Erro na API (${response.status}):`, await response.text());
        continue;
      }

      const data = await response.json();
      console.log(`[Escavador] Resposta (formato ${formato}):`, JSON.stringify(data).substring(0, 300));
      console.log(`[Escavador] Total items:`, data.items?.length || 0);
      console.log(`[Escavador] Paginator total:`, data.paginator?.total || 0);

      if (data.items && data.items.length > 0) {
        processoEncontrado = data.items[0];
        formatoUtilizado = formato;
        console.log(`[Escavador] ✅ Processo encontrado com formato: ${formato}`);
        break;
      }
    }

    // Se nenhum formato funcionou
    if (!processoEncontrado) {
      console.log('[Escavador] ❌ Processo não encontrado em nenhum formato');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Processo não encontrado na base de dados do Escavador',
          details: {
            numeroConsultado: numeroProcesso,
            formatosTentados: formatos,
            sugestao: 'Tente processos de tribunais maiores (STF, STJ, TJSP) ou processos mais antigos'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processoEscavador = processoEncontrado;
    console.log(`[Escavador] Processando dados do processo encontrado (formato: ${formatoUtilizado})`);

    // Salvar/Atualizar no banco
    const { error: upsertError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .upsert({
        processo_id: processoId,
        escavador_id: processoEscavador.id || null,
        escavador_data: processoEscavador,
        classe: processoEscavador.classe || null,
        assunto: processoEscavador.assunto || null,
        area: processoEscavador.area || null,
        tribunal: processoEscavador.tribunal || null,
        data_distribuicao: processoEscavador.data_distribuicao || null,
        valor_causa: processoEscavador.valor_causa || null,
        ultima_consulta: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'processo_id'
      });

    if (upsertError) {
      console.error('[Escavador] Erro ao salvar:', upsertError);
      throw upsertError;
    }

    // Importar movimentações históricas
    if (processoEscavador.movimentacoes && Array.isArray(processoEscavador.movimentacoes) && processoEscavador.movimentacoes.length > 0) {
      console.log(`[Escavador] Importando ${processoEscavador.movimentacoes.length} movimentações históricas`);
      
      // Buscar o ID do monitoramento recém criado
      const { data: monitoramentoData } = await supabaseClient
        .from('processo_monitoramento_escavador')
        .select('id')
        .eq('processo_id', processoId)
        .single();

      if (monitoramentoData) {
        // Preparar movimentações para inserção em lote
        const movimentacoesParaInserir = processoEscavador.movimentacoes.map((mov: any) => ({
          processo_id: processoId,
          monitoramento_id: monitoramentoData.id,
          tipo_atualizacao: 'importacao_historica',
          descricao: mov.descricao || mov.texto || mov.conteudo || 'Movimentação sem descrição',
          data_evento: mov.data || mov.data_movimentacao || new Date().toISOString(),
          dados_completos: mov,
          lida: true, // Marcar como lida pois são históricas
          notificacao_enviada: false
        }));

        // Inserir em lote
        const { error: insertError } = await supabaseClient
          .from('processo_atualizacoes_escavador')
          .insert(movimentacoesParaInserir);

        if (insertError) {
          console.error('[Escavador] Erro ao importar movimentações:', insertError);
        } else {
          console.log(`[Escavador] ${movimentacoesParaInserir.length} movimentações importadas com sucesso`);
          
          // Atualizar contador total
          await supabaseClient
            .from('processo_monitoramento_escavador')
            .update({ 
              total_atualizacoes: movimentacoesParaInserir.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', monitoramentoData.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processoEscavador 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Escavador] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
