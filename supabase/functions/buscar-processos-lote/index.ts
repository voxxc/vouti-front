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
          
          // Prioridade: PJe Comunicações (dados completos) → DataJud API (fallback)
          console.log(`🌐 Tentando PJe Comunicações para ${numeroProcesso}...`);
          const resultPje = await buscarViaPje(numeroProcesso, tribunal, dataInicio, dataFim);
          
          if (resultPje.success) {
            console.log(`✅ Sucesso via PJe: ${numeroProcesso}`, { movimentacoes: resultPje.movimentacoes.length });
            return resultPje;
          }
          
          // Fallback para DataJud
          console.log(`⚠️ PJe falhou, tentando DataJud API para ${numeroProcesso}...`);
          const resultDatajud = await buscarViaDatajud(numeroProcesso, tribunal, dataInicio, dataFim);
          
          if (resultDatajud.success) {
            console.log(`✅ Sucesso via DataJud (fallback): ${numeroProcesso}`, { movimentacoes: resultDatajud.movimentacoes.length });
          } else {
            console.log(`❌ Ambas as fontes falharam para ${numeroProcesso}`);
          }
          
          return resultDatajud;

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
  
  // Pattern aprimorado para capturar intimações PJe com todos os detalhes estruturados
  // Captura: órgão, data disponibilização, tipo, meio, partes, advogados, texto, prazo, inteiro teor
  const intimacaoRegex = /<strong>(\d+)\s*-\s*Intimação<\/strong>([\s\S]*?)(?=<strong>\d+\s*-|$)/gi;
  
  let match;
  while ((match = intimacaoRegex.exec(html)) !== null) {
    const sequencia = parseInt(match[1], 10);
    const blocoIntimacao = match[2];
    
    // Extrair data principal
    const dataMatch = blocoIntimacao.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (!dataMatch) continue;
    
    const [dia, mes, ano] = dataMatch[1].split('/');
    const data = `${ano}-${mes}-${dia}T00:00:00Z`;
    
    // Extrair descrição
    const descricaoMatch = blocoIntimacao.match(/Descrição:\s*([^<\n]+)/i);
    const descricao = descricaoMatch ? descricaoMatch[1].trim() : 'Intimação';
    
    // Extrair campos estruturados
    const metadata: any = {
      fonte_pje: true
    };
    
    // Órgão
    const orgaoMatch = blocoIntimacao.match(/Órgão:\s*<\/strong>\s*([^<\n]+)/i);
    if (orgaoMatch) metadata.orgao = orgaoMatch[1].trim();
    
    // Data de disponibilização
    const dataDispMatch = blocoIntimacao.match(/Data de disponibilização:\s*<\/strong>\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dataDispMatch) metadata.data_disponibilizacao = dataDispMatch[1].trim();
    
    // Tipo de comunicação
    const tipoMatch = blocoIntimacao.match(/Tipo de comunicação:\s*<\/strong>\s*([^<\n]+)/i);
    if (tipoMatch) metadata.tipo_comunicacao = tipoMatch[1].trim();
    
    // Meio
    const meioMatch = blocoIntimacao.match(/Meio:\s*<\/strong>\s*([^<\n]+)/i);
    if (meioMatch) metadata.meio = meioMatch[1].trim();
    
    // Parte(s) - pode ter múltiplas linhas separadas por <br>
    const partesMatch = blocoIntimacao.match(/Parte\(s\):\s*<\/strong>([\s\S]*?)(?=<strong>|Advogado\(s\):)/i);
    if (partesMatch) {
      metadata.partes = partesMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .split('\n')
        .map((p: string) => p.replace(/<[^>]+>/g, '').trim())
        .filter((p: string) => p.length > 0);
    }
    
    // Advogado(s) - pode ter múltiplos separados por <br>
    const advogadosMatch = blocoIntimacao.match(/Advogado\(s\):\s*<\/strong>([\s\S]*?)(?=<strong>|Texto da intimação:|$)/i);
    if (advogadosMatch) {
      metadata.advogados = advogadosMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .split('\n')
        .map((a: string) => a.replace(/<[^>]+>/g, '').trim())
        .filter((a: string) => a.length > 0);
    }
    
    // Texto da intimação (preservar formatação básica)
    const textoMatch = blocoIntimacao.match(/Texto da intimação:\s*<\/strong>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    if (textoMatch) {
      metadata.texto_intimacao = textoMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '')
        .replace(/<strong>/gi, '')
        .replace(/<\/strong>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .trim();
    }
    
    // Início do prazo
    const prazoMatch = blocoIntimacao.match(/Início do prazo:\s*<\/strong>\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (prazoMatch) metadata.inicio_prazo = prazoMatch[1].trim();
    
    // Link inteiro teor
    const inteiroTeorMatch = blocoIntimacao.match(/<a[^>]*href=["']([^"']+)["'][^>]*>.*?Inteiro teor/i);
    if (inteiroTeorMatch) {
      // Garantir URL absoluta
      let link = inteiroTeorMatch[1].trim();
      if (link.startsWith('/')) {
        // Construir URL completa se for relativa
        link = `https://www.tjpr.jus.br${link}`;
      }
      metadata.inteiro_teor_link = link;
    }
    
    // Texto completo (fallback, menos formatado)
    const textoCompleto = blocoIntimacao
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    movimentacoes.push({
      tipo: 'intimacao',
      sequencia,
      descricao,
      data,
      texto_completo: textoCompleto.length > 20 ? textoCompleto : undefined,
      metadata_completa: metadata
    });
  }
  
  // Ordenar por data (mais recentes primeiro)
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
