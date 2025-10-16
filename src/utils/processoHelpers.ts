/**
 * Extrai a sigla do tribunal a partir do número do processo no formato CNJ
 * Formato: NNNNNNN-DD.AAAA.J.TT.OOOO
 * J = Segmento da Justiça (8 = Estadual, 4 = Federal, 5 = Trabalho)
 * TT = Código do Tribunal
 */
export const extrairTribunalDoNumeroProcesso = (numeroProcesso: string): string => {
  const match = numeroProcesso.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  
  if (!match) {
    console.warn(`Formato de processo inválido: ${numeroProcesso}`);
    return 'TJPR'; // fallback padrão
  }
  
  const segmento = match[1];
  const codigoTribunal = match[2];
  
  // Justiça Estadual (8)
  if (segmento === '8') {
    const mapaEstadual: Record<string, string> = {
      '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '04': 'TJAM',
      '05': 'TJBA', '06': 'TJCE', '07': 'TJDF', '08': 'TJES',
      '09': 'TJGO', '10': 'TJMA', '11': 'TJMT', '12': 'TJMS',
      '13': 'TJMG', '14': 'TJPA', '15': 'TJPB', '16': 'TJPR',
      '17': 'TJPE', '18': 'TJPI', '19': 'TJRJ', '20': 'TJRN',
      '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC',
      '25': 'TJSP', '26': 'TJSE', '27': 'TJTO'
    };
    return mapaEstadual[codigoTribunal] || 'TJPR';
  }
  
  // Justiça Federal (4)
  if (segmento === '4') {
    return `TRF${codigoTribunal}`;
  }
  
  // Justiça do Trabalho (5)
  if (segmento === '5') {
    return `TRT${codigoTribunal}`;
  }
  
  console.warn(`Segmento de justiça desconhecido: ${segmento}`);
  return 'TJPR'; // fallback
};
