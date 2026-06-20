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
    const {
      processoId,
      numeroProcesso,
      tenantId = null,
      ativarMonitoramento = false,
    } = await req.json();

    if (!processoId || !numeroProcesso) {
      throw new Error('processoId e numeroProcesso sao obrigatorios');
    }

    console.log('[Escavador Importar] 🔧 Iniciando importação:', numeroProcesso, '| monitoramento:', ativarMonitoramento);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      throw new Error('Token Escavador não configurado');
    }

    // === 1. CONSULTAR API ESCAVADOR ===
    const formatos = (() => {
      const limpo = numeroProcesso.replace(/\D/g, '');
      return [numeroProcesso, limpo, numeroProcesso.replace(/-/g, '.')];
    })();

    let processoEncontrado: any = null;

    for (const formato of formatos) {
      const url = new URL('https://api.escavador.com/api/v1/busca');
      url.searchParams.append('q', formato);
      url.searchParams.append('qo', 'processos');
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${escavadorToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          processoEncontrado = data.items[0];
          console.log('[Escavador Importar] ✅ Processo encontrado:', {
            id: processoEncontrado.id,
            classe: processoEncontrado.classe,
            tribunal: processoEncontrado.tribunal,
            totalMovimentacoes: processoEncontrado.movimentacoes?.length || 0,
          });
          break;
        }
      } else {
        console.log('[Escavador Importar] busca falhou:', response.status, formato);
      }
    }

    if (!processoEncontrado) {
      return Response.json(
        {
          success: false,
          message: 'Processo não encontrado no Escavador',
        },
        { headers: corsHeaders }
      );
    }

    // === 2. UPSERT MONITORAMENTO (capa) ===
    const { error: upsertError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .upsert(
        {
          processo_id: processoId,
          tenant_id: tenantId,
          escavador_id: String(processoEncontrado.id ?? ''),
          escavador_data: processoEncontrado,
          classe: processoEncontrado.classe ?? null,
          assunto: processoEncontrado.assunto ?? null,
          area: processoEncontrado.area ?? null,
          tribunal: processoEncontrado.tribunal ?? null,
          data_distribuicao: processoEncontrado.data_distribuicao ?? null,
          valor_causa: processoEncontrado.valor_causa ?? null,
          monitoramento_ativo: !!ativarMonitoramento,
          ultima_consulta: new Date().toISOString(),
        },
        { onConflict: 'processo_id' }
      );

    if (upsertError) {
      console.error('[Escavador Importar] Erro ao salvar monitoramento:', upsertError);
      throw upsertError;
    }

    // === 3. SALVAR MOVIMENTAÇÕES ===
    const movimentacoes: any[] = processoEncontrado.movimentacoes || [];
    let totalSalvas = 0;

    console.log(`[Escavador Importar] Salvando ${movimentacoes.length} movimentações...`);

    for (const mov of movimentacoes) {
      const { error: movError } = await supabaseClient
        .from('processo_atualizacoes_escavador')
        .insert({
          processo_id: processoId,
          tenant_id: tenantId,
          tipo_atualizacao: 'importacao_inicial',
          descricao: mov.descricao || mov.texto || 'Sem descrição',
          data_evento: mov.data || new Date().toISOString(),
          dados_completos: mov,
          lida: false,
          notificacao_enviada: false,
        });

      if (!movError) totalSalvas++;
      else console.error('[Escavador Importar] erro inserindo mov:', movError.message);
    }

    console.log(`[Escavador Importar] ✅ ${totalSalvas} movimentações salvas`);

    return Response.json(
      {
        success: true,
        andamentosInseridos: totalSalvas,
        monitoramentoAtivado: !!ativarMonitoramento,
        capa: {
          classe: processoEncontrado.classe ?? null,
          assunto: processoEncontrado.assunto ?? null,
          area: processoEncontrado.area ?? null,
          tribunal: processoEncontrado.tribunal ?? null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Escavador Importar] 💥 Erro:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});