import { parse, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

export interface IntimacaoParsed {
  isIntimacao: boolean;
  prazoDias: number | null;
  dataInicial: Date | null;
  dataFinal: Date | null;
  status: 'ABERTO' | 'FECHADO' | 'DESCONHECIDO';
  statusCodigo: string | null;
  diasRestantes: number | null;
  urgencia: 'critica' | 'alta' | 'media' | 'baixa' | null;
  vencida: boolean;
}

/**
 * Parse intimacao description to extract structured data
 */
export function parseIntimacao(descricao: string | null | undefined): IntimacaoParsed {
  const resultado: IntimacaoParsed = {
    isIntimacao: false,
    prazoDias: null,
    dataInicial: null,
    dataFinal: null,
    status: 'DESCONHECIDO',
    statusCodigo: null,
    diasRestantes: null,
    urgencia: null,
    vencida: false,
  };

  if (!descricao) return resultado;

  const descLower = descricao.toLowerCase();
  resultado.isIntimacao = descLower.includes('intimação') || descLower.includes('intimacao');

  if (!resultado.isIntimacao) return resultado;

  // Extract prazo (e.g., "Prazo: 15 dias" or "Prazo: 5 dias úteis")
  const prazoMatch = descricao.match(/Prazo:\s*(\d+)\s*dias/i);
  if (prazoMatch) {
    resultado.prazoDias = parseInt(prazoMatch[1], 10);
  }

  // Extract data inicial (e.g., "Data inicial da contagem do prazo: 10/12/2024")
  const dataInicialMatch = descricao.match(/Data inicial[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dataInicialMatch) {
    try {
      resultado.dataInicial = parse(dataInicialMatch[1], 'dd/MM/yyyy', new Date());
    } catch {}
  }

  // Extract data final (e.g., "Data final: 25/12/2024")
  const dataFinalMatch = descricao.match(/Data final:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dataFinalMatch) {
    try {
      resultado.dataFinal = parse(dataFinalMatch[1], 'dd/MM/yyyy', new Date());
    } catch {}
  }

  // Extract status (e.g., "Status: ABERTO" or "Status: FECHADO (57 - PETIÇÃO)")
  const statusMatch = descricao.match(/Status:\s*(ABERTO|FECHADO)(\s*\([^)]+\))?/i);
  if (statusMatch) {
    resultado.status = statusMatch[1].toUpperCase() as 'ABERTO' | 'FECHADO';
    if (statusMatch[2]) {
      resultado.statusCodigo = statusMatch[2].trim();
    }
  }

  // Calculate dias restantes and urgencia
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (resultado.dataFinal) {
    const dataFinalNorm = new Date(resultado.dataFinal);
    dataFinalNorm.setHours(0, 0, 0, 0);
    
    resultado.diasRestantes = differenceInDays(dataFinalNorm, hoje);
    resultado.vencida = isBefore(dataFinalNorm, hoje);

    if (resultado.status === 'ABERTO') {
      if (resultado.vencida) {
        resultado.urgencia = 'critica';
      } else if (resultado.diasRestantes <= 3) {
        resultado.urgencia = 'critica';
      } else if (resultado.diasRestantes <= 5) {
        resultado.urgencia = 'alta';
      } else if (resultado.diasRestantes <= 10) {
        resultado.urgencia = 'media';
      } else {
        resultado.urgencia = 'baixa';
      }
    }
  } else if (resultado.dataInicial && resultado.prazoDias) {
    // Calculate data final from data inicial + prazo
    resultado.dataFinal = addDays(resultado.dataInicial, resultado.prazoDias);
    const dataFinalNorm = new Date(resultado.dataFinal);
    dataFinalNorm.setHours(0, 0, 0, 0);
    
    resultado.diasRestantes = differenceInDays(dataFinalNorm, hoje);
    resultado.vencida = isBefore(dataFinalNorm, hoje);

    if (resultado.status === 'ABERTO') {
      if (resultado.vencida) {
        resultado.urgencia = 'critica';
      } else if (resultado.diasRestantes <= 3) {
        resultado.urgencia = 'critica';
      } else if (resultado.diasRestantes <= 5) {
        resultado.urgencia = 'alta';
      } else if (resultado.diasRestantes <= 10) {
        resultado.urgencia = 'media';
      } else {
        resultado.urgencia = 'baixa';
      }
    }
  }

  return resultado;
}

/**
 * Get urgency badge color classes
 */
export function getUrgenciaBadgeClasses(urgencia: IntimacaoParsed['urgencia']): string {
  switch (urgencia) {
    case 'critica':
      return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'alta':
      return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'media':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'baixa':
      return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get urgency label
 */
export function getUrgenciaLabel(urgencia: IntimacaoParsed['urgencia'], diasRestantes: number | null, vencida: boolean): string {
  if (vencida) return 'VENCIDA';
  if (diasRestantes === null) return '';
  
  if (diasRestantes === 0) return 'Vence hoje';
  if (diasRestantes === 1) return 'Vence amanha';
  if (diasRestantes < 0) return `Vencida ha ${Math.abs(diasRestantes)} dias`;
  
  return `${diasRestantes} dias restantes`;
}

/**
 * Count intimacoes urgentes (abertas com prazo <= 5 dias ou vencidas)
 */
export function countIntimacoesUrgentes(andamentos: any[]): number {
  return andamentos.filter(a => {
    const parsed = parseIntimacao(a.descricao);
    return parsed.isIntimacao && 
           parsed.status === 'ABERTO' && 
           (parsed.urgencia === 'critica' || parsed.urgencia === 'alta');
  }).length;
}
