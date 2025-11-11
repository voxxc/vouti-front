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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Escavador Recorrente] Iniciando consulta mensal...');

    // Buscar todos os processos com monitoramento ativo
    const { data: monitoramentos, error: fetchError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .select(`
        id,
        processo_id,
        escavador_id,
        processos!inner(numero_processo)
      `)
      .eq('monitoramento_ativo', true);

    if (fetchError) {
      console.error('[Escavador Recorrente] Erro ao buscar processos:', fetchError);
      throw fetchError;
    }

    console.log(`[Escavador Recorrente] Encontrados ${monitoramentos?.length || 0} processos para atualizar`);

    let sucessos = 0;
    let erros = 0;

    // Processar cada monitoramento
    for (const mon of monitoramentos || []) {
      try {
        // Chamar a função escavador-consulta para cada processo
        const { error: invokeError } = await supabaseClient.functions.invoke('escavador-consulta', {
          body: { 
            processoId: mon.processo_id,
            numeroProcesso: mon.processos.numero_processo
          }
        });

        if (invokeError) {
          console.error(`[Escavador Recorrente] Erro no processo ${mon.processos.numero_processo}:`, invokeError);
          erros++;
        } else {
          console.log(`[Escavador Recorrente] Processo ${mon.processos.numero_processo} atualizado com sucesso`);
          sucessos++;
        }

        // Aguardar 2 segundos entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[Escavador Recorrente] Erro ao processar ${mon.processos.numero_processo}:`, error);
        erros++;
      }
    }

    console.log(`[Escavador Recorrente] Finalizado - Sucessos: ${sucessos}, Erros: ${erros}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: monitoramentos?.length || 0,
        sucessos,
        erros
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Escavador Recorrente] Erro geral:', error);
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
