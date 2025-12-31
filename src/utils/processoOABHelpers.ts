import type { ProcessoOAB } from "@/types/busca-oab";

export interface PartesExtraidas {
  parte_ativa: string;
  parte_passiva: string;
  advogados_partes: any;
}

/**
 * Extrai e organiza as partes do processo a partir dos dados da Judit
 * Suporta campo 'side' (Active, Passive, Interested) e fallbacks para 2ª instância
 */
export function extrairPartesDoProcesso(processo: ProcessoOAB): PartesExtraidas {
  const partes = processo.partes || [];
  
  // Identificar autores/parte ativa (considerando 'side')
  const autores = partes
    .filter(p => {
      const tipo = (p.tipo || '').toLowerCase();
      const papel = (p.papel || '').toLowerCase();
      const side = ((p as any).side || '').toLowerCase();
      
      // Priorizar 'side' se disponível
      if (side === 'active' || side === 'plaintiff' || side === 'author') {
        return true;
      }
      
      return tipo.includes('autor') || 
             tipo.includes('requerente') || 
             tipo.includes('exequente') ||
             tipo.includes('ativo') ||
             papel.includes('autor') ||
             papel.includes('requerente') ||
             papel.includes('ativo');
    })
    .map(p => p.nome)
    .filter(Boolean);
  
  // Identificar réus/parte passiva (considerando 'side')
  const reus = partes
    .filter(p => {
      const tipo = (p.tipo || '').toLowerCase();
      const papel = (p.papel || '').toLowerCase();
      const side = ((p as any).side || '').toLowerCase();
      
      // Priorizar 'side' se disponível
      if (side === 'passive' || side === 'defendant') {
        return true;
      }
      
      return tipo.includes('réu') || 
             tipo.includes('reu') || 
             tipo.includes('requerido') ||
             tipo.includes('executado') ||
             tipo.includes('passivo') ||
             papel.includes('réu') ||
             papel.includes('reu') ||
             papel.includes('passivo');
    })
    .map(p => p.nome)
    .filter(Boolean);
  
  // Identificar interessados (comum em 2ª instância)
  const interessados = partes
    .filter(p => {
      const side = ((p as any).side || '').toLowerCase();
      const tipo = (p.tipo || '').toLowerCase();
      return side === 'interested' || side === 'third_party' || 
             tipo.includes('interessado') || tipo.includes('terceiro');
    })
    .map(p => p.nome)
    .filter(Boolean);
  
  // Identificar advogados
  const advogados = partes
    .filter(p => {
      const tipo = (p.tipo || '').toLowerCase();
      return tipo.includes('advogado');
    })
    .map(p => ({
      nome: p.nome,
      tipo: p.tipo,
      papel: p.papel,
      principal: p.principal,
      dados_completos: p
    }));
  
  let parte_ativa = autores.length > 0 ? autores.join(' e ') : '';
  let parte_passiva = reus.length > 0 ? reus.join(' e ') : '';
  
  // Fallback 1: Se não encontrou autor/réu mas tem interessado
  if (!parte_ativa && !parte_passiva && interessados.length > 0) {
    parte_ativa = interessados.join(' e ');
    parte_passiva = '(Parte interessada - processo recursal)';
  }
  
  // Fallback 2: Se ainda não temos partes, usar "A definir"
  if (!parte_ativa) parte_ativa = 'A definir';
  if (!parte_passiva) parte_passiva = 'A definir';
  
  return {
    parte_ativa,
    parte_passiva,
    advogados_partes: advogados.length > 0 ? advogados : null
  };
}
