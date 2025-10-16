import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processo_id, numero_processo, tribunal } = await req.json();

    console.log('Buscando andamentos via DataJud:', { numero_processo, tribunal });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Formatar número do processo (remover pontos e hífens)
    const numeroFormatado = numero_processo.replace(/[.-]/g, '');
    
    // Mapear tribunal para código DataJud
    const tribunalMap: Record<string, string> = {
      'TJPR': 'tjpr',
      'TJSP': 'tjsp',
      'TJRJ': 'tjrj',
      'TJMG': 'tjmg',
      'TJRS': 'tjrs',
      'TJSC': 'tjsc',
      'TJGO': 'tjgo',
      'TJCE': 'tjce',
      'TJPE': 'tjpe',
      'TJBA': 'tjba',
    };

    const tribunalCode = tribunalMap[tribunal.toUpperCase()] || tribunal.toLowerCase();
    const apiUrl = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunalCode}/_search`;

    console.log('Chamando DataJud API:', apiUrl);

    // Fazer request para DataJud API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: numeroFormatado
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`DataJud API retornou ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log('Resposta DataJud:', JSON.stringify(data).substring(0, 500));

    // Extrair movimentações do resultado
    const hits = data.hits?.hits || [];
    if (hits.length === 0) {
      console.log('Nenhum processo encontrado no DataJud');
      return new Response(
        JSON.stringify({ 
          success: true, 
          total_encontradas: 0, 
          novas_inseridas: 0,
          message: 'Nenhum processo encontrado no DataJud'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processo = hits[0]._source;
    const movimentacoes = processo.movimentos || [];

    console.log(`Encontradas ${movimentacoes.length} movimentações no DataJud`);

    let novasInseridas = 0;

    // Buscar movimentações existentes para evitar duplicatas
    const { data: existentes } = await supabase
      .from('processo_movimentacoes')
      .select('descricao, data_movimentacao')
      .eq('processo_id', processo_id);

    const existentesSet = new Set(
      (existentes || []).map((m: any) => 
        `${m.descricao}_${new Date(m.data_movimentacao).toISOString().split('T')[0]}`
      )
    );

    // Inserir novas movimentações
    for (const mov of movimentacoes) {
      const dataMovimentacao = new Date(mov.dataHora);
      const descricao = mov.complementoNacional?.nome || mov.nome || 'Movimentação';
      const chaveUnica = `${descricao}_${dataMovimentacao.toISOString().split('T')[0]}`;

      // Verificar se já existe
      if (existentesSet.has(chaveUnica)) {
        console.log('Movimentação já existe:', chaveUnica);
        continue;
      }

      const { error } = await supabase
        .from('processo_movimentacoes')
        .insert({
          processo_id,
          tipo: 'andamento',
          data_movimentacao: dataMovimentacao.toISOString(),
          descricao,
          is_automated: true,
          status_conferencia: 'pendente',
          metadata: {
            fonte: 'datajud_api',
            tribunal: tribunal.toUpperCase(),
            codigo_movimento: mov.codigo,
            complemento: mov.complementoNacional?.descricao,
            extraido_em: new Date().toISOString(),
          }
        });

      if (error) {
        console.error('Erro ao inserir movimentação:', error);
      } else {
        novasInseridas++;
      }
    }

    console.log(`${novasInseridas} novas movimentações inseridas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_encontradas: movimentacoes.length, 
        novas_inseridas: novasInseridas,
        fonte: 'datajud_api'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao buscar andamentos DataJud:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fonte: 'datajud_api'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
