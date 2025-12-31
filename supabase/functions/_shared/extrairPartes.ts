/**
 * Extrai partes (ativa/passiva) de um processo considerando:
 * 1. Campo 'side' da API Judit (Active, Passive, Interested)
 * 2. Campo 'person_type' (ATIVO, PASSIVO, AUTOR, REU, etc)
 * 3. Campo 'name' com padrão "X" (fallback)
 * 4. Campo 'name' direto para processos de 2ª instância (fallback final)
 */
export interface PartesExtraidas {
  parteAtiva: string;
  partePassiva: string;
  advogados: string[];
}

export function extrairPartesDoProcesso(responseData: any): PartesExtraidas {
  const parties = responseData?.parties || [];
  const advogados: string[] = [];
  
  // Identificar autores/parte ativa considerando 'side' e 'person_type'
  const autores = parties
    .filter((p: any) => {
      const tipo = (p.person_type || p.tipo || '').toUpperCase();
      const side = (p.side || '').toLowerCase();
      const papel = (p.role || p.papel || '').toLowerCase();
      
      // Priorizar 'side' se disponível
      if (side === 'active' || side === 'plaintiff' || side === 'author') {
        return true;
      }
      
      // Fallback para person_type/tipo
      if (tipo.includes('ATIVO') || tipo.includes('AUTOR') || tipo.includes('REQUERENTE') || tipo.includes('EXEQUENTE')) {
        return true;
      }
      
      // Fallback para role/papel
      if (papel.includes('autor') || papel.includes('requerente') || papel.includes('exequente') || papel.includes('ativo') || papel.includes('reclamante')) {
        return true;
      }
      
      return false;
    })
    .map((p: any) => p.name || p.nome)
    .filter(Boolean);
  
  // Identificar réus/parte passiva considerando 'side' e 'person_type'
  const reus = parties
    .filter((p: any) => {
      const tipo = (p.person_type || p.tipo || '').toUpperCase();
      const side = (p.side || '').toLowerCase();
      const papel = (p.role || p.papel || '').toLowerCase();
      
      // Priorizar 'side' se disponível
      if (side === 'passive' || side === 'defendant') {
        return true;
      }
      
      // Fallback para person_type/tipo
      if (tipo.includes('PASSIVO') || tipo.includes('REU') || tipo.includes('RÉU') || tipo.includes('REQUERIDO') || tipo.includes('EXECUTADO')) {
        return true;
      }
      
      // Fallback para role/papel
      if (papel.includes('réu') || papel.includes('reu') || papel.includes('requerido') || papel.includes('executado') || papel.includes('passivo') || papel.includes('reclamado')) {
        return true;
      }
      
      return false;
    })
    .map((p: any) => p.name || p.nome)
    .filter(Boolean);
  
  // Identificar "Interessados" (comum em 2ª instância)
  const interessados = parties
    .filter((p: any) => {
      const side = (p.side || '').toLowerCase();
      const tipo = (p.person_type || p.tipo || '').toUpperCase();
      
      return side === 'interested' || side === 'third_party' || 
             tipo.includes('INTERESSADO') || tipo.includes('TERCEIRO');
    })
    .map((p: any) => p.name || p.nome)
    .filter(Boolean);
  
  // Extrair advogados
  for (const parte of parties) {
    const tipo = (parte.person_type || parte.tipo || '').toUpperCase();
    
    // Advogado como parte principal
    if (tipo.includes('ADVOGADO')) {
      const oabDoc = parte.documents?.find((d: any) => 
        (d.document_type || '').toLowerCase() === 'oab'
      );
      const oabNum = oabDoc?.document || '';
      const nome = parte.name || parte.nome || '';
      const advStr = oabNum ? `${nome} (OAB ${oabNum})` : nome;
      if (advStr && !advogados.includes(advStr)) {
        advogados.push(advStr);
      }
    }
    
    // Advogados dentro de cada parte (lawyers array)
    if (parte.lawyers && Array.isArray(parte.lawyers)) {
      for (const advogado of parte.lawyers) {
        const advNome = advogado.name || '';
        const oabDoc = advogado.documents?.find((d: any) => 
          (d.document_type || '').toLowerCase() === 'oab'
        );
        const oabNum = oabDoc?.document || '';
        const advStr = oabNum ? `${advNome} (OAB ${oabNum})` : advNome;
        if (advStr && !advogados.includes(advStr)) {
          advogados.push(advStr);
        }
      }
    }
  }
  
  let parteAtiva = autores.length > 0 ? autores.join(' e ') : '';
  let partePassiva = reus.length > 0 ? reus.join(' e ') : '';
  
  // FALLBACK 1: Se não encontrou autor/réu mas tem interessado (comum em 2ª instância)
  if (!parteAtiva && !partePassiva && interessados.length > 0) {
    parteAtiva = interessados.join(' e ');
    partePassiva = '(Parte interessada - processo recursal)';
  }
  
  // FALLBACK 2: Campo "name" com padrão " X " (Autor X Réu)
  if (!parteAtiva && !partePassiva && responseData?.name && responseData.name.includes(' X ')) {
    const partes = responseData.name.split(' X ');
    parteAtiva = partes[0]?.trim() || '';
    partePassiva = partes[1]?.trim() || '';
  }
  
  // FALLBACK 3: Campo "name" direto para processos de 2ª instância
  const instance = responseData?.instance || responseData?.instancia;
  if (!parteAtiva && !partePassiva && responseData?.name && instance && instance >= 2) {
    parteAtiva = responseData.name;
    partePassiva = '(Processo de 2ª instância)';
  }
  
  // FALLBACK 4: Se ainda não tem partes mas tem "name" e parties existe mas vazio ou sem dados úteis
  if (!parteAtiva && !partePassiva && responseData?.name && responseData.name.length > 0) {
    // Se name não contém " X ", usar como parte ativa
    if (!responseData.name.includes(' X ')) {
      parteAtiva = responseData.name;
    }
  }
  
  return {
    parteAtiva,
    partePassiva,
    advogados
  };
}
