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
    
    console.log('[Ativar+Buscar] 🔧 Usando SERVICE_ROLE_KEY para bypass RLS');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      throw new Error('Token Escavador não configurado');
    }

    console.log(`[Ativar+Buscar] Processo: ${numeroProcesso}`);

    // === 1. CONSULTAR API ESCAVADOR ===
    const formatarNumeroProcesso = (numero: string): string[] => {
      const limpo = numero.replace(/\D/g, '');
      return [
        numero,
        limpo,
        numero.replace(/-/g, '.')
      ];
    };

    const formatos = formatarNumeroProcesso(numeroProcesso);
    let processoEncontrado = null;

    for (const formato of formatos) {
      const url = new URL('https://api.escavador.com/api/v1/busca');
      url.searchParams.append('q', formato);
      url.searchParams.append('qo', 'processos');
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${escavadorToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          processoEncontrado = data.items[0];
          console.log(`[Ativar+Buscar] ✅ Encontrado (formato: ${formato})`);
          break;
        }
      }
    }

    if (!processoEncontrado) {
      return Response.json({ 
        success: false, 
        message: 'Processo não encontrado no Escavador',
        details: 'Tente processos de STF, STJ, TJSP ou mais antigos'
      }, { headers: corsHeaders });
    }

    // === 2. SALVAR DADOS GERAIS + ATIVAR ===
    const { error: upsertError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .upsert({
        processo_id: processoId,
        escavador_id: processoEncontrado.id,
        escavador_data: processoEncontrado,
        classe: processoEncontrado.classe,
        assunto: processoEncontrado.assunto,
        area: processoEncontrado.area,
        tribunal: processoEncontrado.tribunal,
        data_distribuicao: processoEncontrado.data_distribuicao,
        valor_causa: processoEncontrado.valor_causa,
        monitoramento_ativo: true, // ATIVA AUTOMATICAMENTE
        ultima_consulta: new Date().toISOString()
      });

    if (upsertError) {
      console.error('[Ativar+Buscar] Erro ao salvar monitoramento:', upsertError);
      throw upsertError;
    }

    // === 3. SALVAR MOVIMENTAÇÕES ===
    const movimentacoes = processoEncontrado.movimentacoes || [];
    let totalSalvas = 0;

    console.log(`[Ativar+Buscar] Salvando ${movimentacoes.length} movimentações...`);

    for (const mov of movimentacoes) {
      const { error: movError } = await supabaseClient
        .from('processo_atualizacoes_escavador')
        .insert({
          processo_id: processoId,
          monitoramento_id: processoEncontrado.id,
          tipo_atualizacao: 'importacao_historica',
          descricao: mov.descricao || mov.texto || 'Sem descrição',
          data_evento: mov.data || new Date().toISOString(),
          dados_completos: mov,
          lida: false, // Marcar como NÃO LIDA
          notificacao_enviada: false
        });

      if (!movError) totalSalvas++;
    }

    console.log(`[Ativar+Buscar] ✅ ${totalSalvas} movimentações salvas`);

    // === 4. RETORNAR SUCESSO ===
    return Response.json({
      success: true,
      totalMovimentacoes: totalSalvas,
      processoData: {
        classe: processoEncontrado.classe,
        assunto: processoEncontrado.assunto,
        tribunal: processoEncontrado.tribunal
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Ativar+Buscar] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
