import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MovimentacaoPJE {
  data: string;
  descricao: string;
  sequencia?: number;
  detalhes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { processo_id, numero_processo, tribunal } = await req.json();

    if (!processo_id || !numero_processo || !tribunal) {
      throw new Error('Missing required parameters');
    }

    console.log(`Buscando andamentos para processo ${numero_processo} no ${tribunal}`);

    // Preparar datas (últimos 90 dias)
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 90);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Construir URL do PJe Comunicações
    const url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${tribunal}&numeroProcesso=${numero_processo}&dataDisponibilizacaoInicio=${formatDate(dataInicio)}&dataDisponibilizacaoFim=${formatDate(dataFim)}`;

    console.log(`Acessando: ${url}`);

    // Fazer requisição ao site
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar PJe: ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML para extrair movimentações
    const movimentacoes = parseMovimentacoes(html);

    console.log(`Encontradas ${movimentacoes.length} movimentações`);

    // Verificar quais já existem no banco
    const { data: existentes } = await supabase
      .from('processo_movimentacoes')
      .select('descricao, data_movimentacao, metadata')
      .eq('processo_id', processo_id)
      .eq('is_automated', true);

    let novasInseridas = 0;

    for (const mov of movimentacoes) {
      // Converter data BR para ISO
      const [dia, mes, ano] = mov.data.split('/');
      const dataISO = `${ano}-${mes}-${dia}T12:00:00`;

      // Verificar duplicatas
      const jExiste = existentes?.some(e => 
        e.descricao === mov.descricao &&
        new Date(e.data_movimentacao).toDateString() === new Date(dataISO).toDateString()
      );

      if (!jExiste) {
        const { error: insertError } = await supabase
          .from('processo_movimentacoes')
          .insert({
            processo_id,
            tipo: 'intimacao',
            data_movimentacao: dataISO,
            descricao: mov.descricao,
            is_automated: true,
            status_conferencia: 'pendente',
            metadata: {
              fonte: 'pje_comunicacoes',
              tribunal,
              sequencia: mov.sequencia,
              detalhes: mov.detalhes,
              url_origem: url,
              extraido_em: new Date().toISOString(),
            },
          });

        if (!insertError) {
          novasInseridas++;
        } else {
          console.error('Erro ao inserir movimentação:', insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_encontradas: movimentacoes.length,
        novas_inseridas: novasInseridas,
        url_consultado: url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na busca de andamentos:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function parseMovimentacoes(html: string): MovimentacaoPJE[] {
  const movimentacoes: MovimentacaoPJE[] = [];

  // Regex para capturar intimações do formato:
  // "Intimação referente ao movimento (seq. 87) JUNTADA DE COMPROVANTE (17/09/2025)."
  const regex = /Intimação referente ao movimento \(seq\. (\d+)\) ([^(]+)\((\d{2}\/\d{2}\/\d{4})\)/gi;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const sequencia = parseInt(match[1], 10);
    const descricao = match[2].trim();
    const data = match[3];

    movimentacoes.push({
      sequencia,
      descricao,
      data,
      detalhes: 'Acesse o sistema Projudi do Tribunal de Justiça do Paraná para mais detalhes.',
    });
  }

  // Fallback: buscar por padrão mais genérico se não encontrar nada
  if (movimentacoes.length === 0) {
    const fallbackRegex = /(\d{2}\/\d{2}\/\d{4})[^\w]*([\w\s]+)/gi;
    while ((match = fallbackRegex.exec(html)) !== null) {
      const data = match[1];
      const descricao = match[2].trim();
      
      if (descricao.length > 10 && descricao.length < 200) {
        movimentacoes.push({ data, descricao });
      }
    }
  }

  return movimentacoes;
}
