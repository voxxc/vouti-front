import type { ProcessoOAB } from "@/types/busca-oab";

export interface PartesExtraidas {
  parte_ativa: string;
  parte_passiva: string;
  advogados_partes: any;
}

/**
 * Parseia um CNJ que pode opcionalmente conter sufixo de apartado.
 * Aceita formatos como:
 *   "4092349-43.2025.8.13.0000"                              → sem apartado
 *   "4092349-43.2025.8.13.0000/1.0000.24.414460-6/006"       → com apartado
 *   "40923434320258130000/1.0000.24.414460-6/006"            → com apartado
 *
 * Os primeiros 20 dígitos sempre formam o CNJ principal; tudo o que vier
 * depois é tratado como sufixo de apartado (prefixado com "/" se necessário).
 */
export function parseCnjComApartado(input: string): {
  cnjPrincipal: string | null;
  sufixoApartado: string | null;
  valido: boolean;
} {
  if (!input) return { cnjPrincipal: null, sufixoApartado: null, valido: false };

  let digits = '';
  let cutIdx = -1;
  for (let i = 0; i < input.length; i++) {
    if (/\d/.test(input[i])) {
      digits += input[i];
      if (digits.length === 20) {
        cutIdx = i + 1;
        break;
      }
    }
  }

  if (digits.length < 20) {
    return { cnjPrincipal: null, sufixoApartado: null, valido: false };
  }

  const cnjPrincipal = `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;

  let sufixoRaw = input.slice(cutIdx).trim();
  if (!sufixoRaw) {
    return { cnjPrincipal, sufixoApartado: null, valido: true };
  }
  if (!sufixoRaw.startsWith('/')) sufixoRaw = '/' + sufixoRaw;

  return { cnjPrincipal, sufixoApartado: sufixoRaw, valido: true };
}

/**
 * Detecta se um processo é sigiloso, considerando:
 *  - secrecy_level >= 1 ou justice_secret === true na capa (judit_data.lawsuit)
 *  - partes mascaradas com termos como "Sigilo", "Segredo de justiça", etc.
 */
const PARTES_SIGILOSAS_REGEX =
  /^\s*(sigilo|sigiloso|sigilosa|segredo de justi[cç]a|sob sigilo)\s*$/i;

function temCapaCega(processo: any): boolean {
  const capa = processo?.judit_data?.lawsuit || processo?.capa_completa?.lawsuit || processo?.capa_completa || {};
  const pa = (processo?.parte_ativa ?? (capa as any).parte_ativa ?? '').toString().trim();
  const pp = (processo?.parte_passiva ?? (capa as any).parte_passiva ?? '').toString().trim();
  if (pa || pp) return false;

  const partesCompletas = processo?.partes_completas;
  const semPartes =
    !partesCompletas ||
    (Array.isArray(partesCompletas) && partesCompletas.length === 0);
  if (!semPartes) return false;

  const steps =
    (capa as any)?.steps ||
    processo?.judit_data?.lawsuit?.steps ||
    processo?.capa_completa?.steps ||
    [];
  const semAndamentosNaCapa = !Array.isArray(steps) || steps.length === 0;
  return semAndamentosNaCapa;
}

export function isProcessoSigiloso(processo: any): boolean {
  if (!processo) return false;
  const capa = processo?.judit_data?.lawsuit || processo?.capa_completa?.lawsuit || processo?.capa_completa || {};
  const partesMascaradas =
    PARTES_SIGILOSAS_REGEX.test(processo.parte_ativa || '') ||
    PARTES_SIGILOSAS_REGEX.test(processo.parte_passiva || '') ||
    PARTES_SIGILOSAS_REGEX.test((capa as any).parte_ativa || '') ||
    PARTES_SIGILOSAS_REGEX.test((capa as any).parte_passiva || '');
  return (
    ((processo as any).secrecy_level ?? 0) >= 1 ||
    ((capa as any).secrecy_level ?? 0) >= 1 ||
    (capa as any).justice_secret === true ||
    partesMascaradas ||
    temCapaCega(processo)
  );
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
