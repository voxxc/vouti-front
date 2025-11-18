import type { ProcessoOAB } from "@/types/busca-oab";

export interface PartesExtraidas {
  parte_ativa: string;
  parte_passiva: string;
  advogados_partes: any;
}

/**
 * Extrai e organiza as partes do processo a partir dos dados da Judit
 */
export function extrairPartesDoProcesso(processo: ProcessoOAB): PartesExtraidas {
  const partes = processo.partes || [];
  
  // Identificar autores
  const autores = partes
    .filter(p => {
      const tipo = p.tipo?.toLowerCase() || '';
      const papel = p.papel?.toLowerCase() || '';
      return tipo.includes('autor') || 
             tipo.includes('requerente') || 
             tipo.includes('exequente') ||
             papel.includes('autor') ||
             papel.includes('requerente');
    })
    .map(p => p.nome);
  
  // Identificar réus
  const reus = partes
    .filter(p => {
      const tipo = p.tipo?.toLowerCase() || '';
      const papel = p.papel?.toLowerCase() || '';
      return tipo.includes('réu') || 
             tipo.includes('reu') || 
             tipo.includes('requerido') ||
             tipo.includes('executado') ||
             papel.includes('réu') ||
             papel.includes('reu');
    })
    .map(p => p.nome);
  
  // Identificar advogados
  const advogados = partes
    .filter(p => {
      const tipo = p.tipo?.toLowerCase() || '';
      return tipo.includes('advogado');
    })
    .map(p => ({
      nome: p.nome,
      tipo: p.tipo,
      papel: p.papel,
      principal: p.principal,
      dados_completos: p
    }));
  
  return {
    parte_ativa: autores.length > 0 ? autores.join(' e ') : 'A definir',
    parte_passiva: reus.length > 0 ? reus.join(' e ') : 'A definir',
    advogados_partes: advogados.length > 0 ? advogados : null
  };
}
