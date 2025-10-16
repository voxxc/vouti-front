import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br/api_publica_';

const TRIBUNAL_MAPPING: Record<string, string> = {
  'TJPR': 'tjpr',
  'TJSP': 'tjsp',
  'TJRJ': 'tjrj',
  'TJMG': 'tjmg',
  'TJRS': 'tjrs',
  'TJSC': 'tjsc',
  'TJBA': 'tjba',
  'TJPE': 'tjpe',
  'TJCE': 'tjce',
  'TJGO': 'tjgo',
};

interface ProcessMovement {
  data: string;
  descricao: string;
  sequencia?: number;
  tipo: string;
  texto_completo?: string;
}

interface ProcessResult {
  numero: string;
  success: boolean;
  tribunal: string;
  fonte: 'datajud_api' | 'pje_comunicacoes' | 'erro';
  movimentacoes: ProcessMovement[];
  ultima_movimentacao?: string;
  erro?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { processos, tribunal = 'TJPR', dataInicio, dataFim } = await req.json();

    if (!processos || !Array.isArray(processos)) {
      throw new Error('Lista de processos inválida');
    }

    console.log('📥 Requisição recebida:', {
      totalProcessos: processos.length,
      tribunal,
      dataInicio,
      dataFim,
      primeiroProcesso: processos[0],
      timestamp: new Date().toISOString()
    });

    // Processar cada processo em paralelo
    const resultados = await Promise.all(
      processos.map(async (numeroProcesso: string): Promise<ProcessResult> => {
        try {
          console.log(`🔍 Processando: ${numeroProcesso}`, dataInicio ? `(${dataInicio} até ${dataFim})` : '(todo histórico)');
          
          // Tentar DataJud primeiro
          console.log(`📊 Tentando DataJud API para ${numeroProcesso}...`);
          const resultDatajud = await buscarViaDatajud(numeroProcesso, tribunal, dataInicio, dataFim);
          
          if (resultDatajud.success) {
            console.log(`✅ Sucesso via DataJud: ${numeroProcesso}`, {
              movimentacoes: resultDatajud.movimentacoes.length
            });
            return resultDatajud;
          }

          // Fallback para scraping PJe
          console.log(`🌐 Fallback para PJe scraping: ${numeroProcesso}...`);
          const resultPje = await buscarViaPje(numeroProcesso, tribunal, dataInicio, dataFim);
          
          console.log(`✅ Sucesso via PJe scraping: ${numeroProcesso}`, {
            movimentacoes: resultPje.movimentacoes.length
          });
          
          return resultPje;

        } catch (error) {
          console.error(`❌ Erro ao buscar processo ${numeroProcesso}:`, {
            erro: error.message,
            stack: error.stack
          });
          return {
            numero: numeroProcesso,
            success: false,
            tribunal,
            fonte: 'erro',
            movimentacoes: [],
            erro: error.message
          };
        }
      })
    );

    // Calcular resumo
    const resumo = {
      total_pesquisados: processos.length,
      sucesso: resultados.filter(r => r.success).length,
      falhas: resultados.filter(r => !r.success).length,
      fonte_datajud: resultados.filter(r => r.fonte === 'datajud_api').length,
      fonte_scraping: resultados.filter(r => r.fonte === 'pje_comunicacoes').length
    };

    console.log('📊 Resumo final:', resumo);

    return new Response(
      JSON.stringify({ processos: resultados, resumo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function buscarViaDatajud(
  numeroProcesso: string, 
  tribunal: string,
  dataInicio?: string,
  dataFim?: string
): Promise<ProcessResult> {
  const numeroLimpo = numeroProcesso.replace(/\D/g, '');
  const tribunalCod = TRIBUNAL_MAPPING[tribunal] || 'tjpr';

  const url = `${DATAJUD_BASE_URL}${tribunalCod}/_search`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: numeroLimpo
          }
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DataJud API retornou ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.hits?.hits || data.hits.hits.length === 0) {
      throw new Error('Processo não encontrado no DataJud');
    }

    const processo = data.hits.hits[0]._source;
    
    // Filtrar movimentos por data se fornecido
    let movimentos = processo.movimentos || [];
    if (dataInicio || dataFim) {
      movimentos = movimentos.filter((mov: any) => {
        const dataMovimentacao = new Date(mov.dataHora);
        if (dataInicio && dataMovimentacao < new Date(dataInicio)) return false;
        if (dataFim && dataMovimentacao > new Date(dataFim)) return false;
        return true;
      });
    }

    const movimentacoes: ProcessMovement[] = movimentos.map((mov: any) => {
      // Capturar TODOS os dados disponíveis, organizados por tipo
      const dadosCompletos: any = {};
      
      // 1. Complementos Tabelados (dados estruturados)
      if (mov.complementosTabelados && mov.complementosTabelados.length > 0) {
        dadosCompletos.complementos_tabelados = mov.complementosTabelados.map((comp: any) => ({
          codigo: comp.codigo,
          nome: comp.nome,
          descricao: comp.descricao,
          texto: comp.texto
        }));
      }
      
      // 2. Complementos (texto livre)
      if (mov.complementos) {
        dadosCompletos.complementos = mov.complementos;
      }
      
      // 3. Observações
      if (mov.observacao) {
        dadosCompletos.observacao = mov.observacao;
      }
      
      // 4. Nome original do movimento
      if (mov.nome) {
        dadosCompletos.nome_original = mov.nome;
      }
      
      return {
        data: mov.dataHora,
        descricao: mov.complementosTabelados?.[0]?.descricao || mov.nome || 'Movimentação',
        sequencia: mov.sequencial,
        tipo: detectarTipoMovimento(mov.nome || ''),
        metadata_completa: dadosCompletos
      };
    });

    return {
      numero: numeroProcesso,
      success: true,
      tribunal,
      fonte: 'datajud_api',
      movimentacoes,
      ultima_movimentacao: movimentacoes[0]?.data
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function buscarViaPje(
  numeroProcesso: string, 
  tribunal: string,
  dataInicio?: string,
  dataFim?: string
): Promise<ProcessResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    // Usar datas fornecidas ou fallback para últimos 90 dias
    let finalDataInicio: Date;
    let finalDataFim: Date;

    if (dataInicio && dataFim) {
      finalDataInicio = new Date(dataInicio);
      finalDataFim = new Date(dataFim);
    } else {
      finalDataFim = new Date();
      finalDataInicio = new Date();
      finalDataInicio.setDate(finalDataInicio.getDate() - 90);
    }

    const url = `https://pje.${tribunal.toLowerCase()}.jus.br/pje/ConsultaPublica/DetalheProcessoConsultaPublica/documentoSemLoginHTML.seam?ca=`
      + `&idProcessoDoc=&idDocumento=&idProcesso=${numeroProcesso}`
      + `&dataInicial=${finalDataInicio.toISOString().split('T')[0]}`
      + `&dataFinal=${finalDataFim.toISOString().split('T')[0]}`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Erro ao buscar no PJe');
    }

    const html = await response.text();
    let movimentacoes = parseMovimentacoesPje(html);

    // Filtrar por data novamente para garantir
    if (dataInicio || dataFim) {
      movimentacoes = movimentacoes.filter(mov => {
        const dataMovimentacao = new Date(mov.data);
        if (dataInicio && dataMovimentacao < new Date(dataInicio)) return false;
        if (dataFim && dataMovimentacao > new Date(dataFim)) return false;
        return true;
      });
    }

    if (movimentacoes.length === 0) {
      throw new Error('Nenhuma movimentação encontrada no PJe');
    }

    return {
      numero: numeroProcesso,
      success: true,
      tribunal,
      fonte: 'pje_comunicacoes',
      movimentacoes,
      ultima_movimentacao: movimentacoes[0]?.data
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseMovimentacoesPje(html: string): ProcessMovement[] {
  const movimentacoes: ProcessMovement[] = [];
  
  // Regex expandido para capturar também o conteúdo completo
  const intimacaoRegex = /<strong>(\d+)\s*-\s*Intimação<\/strong>[\s\S]*?Descrição:\s*([^<]+)[\s\S]*?Data:\s*(\d{2}\/\d{2}\/\d{4})([\s\S]*?)(?=<strong>\d+\s*-|$)/gi;
  let match;

  while ((match = intimacaoRegex.exec(html)) !== null) {
    const [, sequencia, descricao, data, conteudoHtml] = match;
    const [dia, mes, ano] = data.split('/');
    
    // Limpar o conteúdo HTML para extrair apenas o texto
    const textoCompleto = conteudoHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove todas as tags HTML
      .replace(/&nbsp;/g, ' ') // Remove &nbsp;
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    movimentacoes.push({
      sequencia: parseInt(sequencia),
      descricao: descricao.trim(),
      data: `${ano}-${mes}-${dia}T00:00:00Z`,
      tipo: 'intimacao',
      texto_completo: textoCompleto.length > 20 ? textoCompleto : undefined // Só salva se tiver conteúdo relevante
    });
  }

  return movimentacoes.sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );
}

function detectarTipoMovimento(nome: string): string {
  const lower = nome.toLowerCase();
  
  // Prioridade: verificar tipos mais específicos primeiro
  if (lower.includes('sentença') || lower.includes('sentenca')) return 'sentenca';
  if (lower.includes('recurso')) return 'recurso';
  if (lower.includes('audiência') || lower.includes('audiencia')) return 'audiencia';
  if (lower.includes('intimação') || lower.includes('intimacao')) return 'intimacao';
  if (lower.includes('publicação') || lower.includes('publicacao')) return 'publicacao';
  if (lower.includes('juntada')) return 'juntada';
  if (lower.includes('petição') || lower.includes('peticao')) return 'peticionamento';
  if (lower.includes('decisão') || lower.includes('decisao')) return 'despacho';
  if (lower.includes('despacho')) return 'despacho';
  
  return 'outros';
}
