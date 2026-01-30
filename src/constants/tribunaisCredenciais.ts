// Lista de tribunais/sistemas disponíveis para o cofre de credenciais da Judit
// Baseado na documentação oficial: https://docs.judit.io/essentials/cofre-de-credenciais

export interface TribunalOption {
  value: string;
  label: string;
  category: string;
}

export const TRIBUNAIS_CREDENCIAIS: TribunalOption[] = [
  // Opção Global
  { value: '*', label: 'Todos os tribunais (global)', category: 'Global' },
  
  // PJE - Tribunais Estaduais 1º Grau
  { value: 'PJE TJAC - 1º grau', label: 'PJE TJAC - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJAL - 1º grau', label: 'PJE TJAL - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJAM - 1º grau', label: 'PJE TJAM - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJAP - 1º grau', label: 'PJE TJAP - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJBA - 1º grau', label: 'PJE TJBA - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJCE - 1º grau', label: 'PJE TJCE - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJDFT - 1º grau', label: 'PJE TJDFT - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJES - 1º grau', label: 'PJE TJES - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJGO - 1º grau', label: 'PJE TJGO - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJMA - 1º grau', label: 'PJE TJMA - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJMG - 1º grau', label: 'PJE TJMG - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJMS - 1º grau', label: 'PJE TJMS - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJMT - 1º grau', label: 'PJE TJMT - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJPA - 1º grau', label: 'PJE TJPA - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJPB - 1º grau', label: 'PJE TJPB - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJPE - 1º grau', label: 'PJE TJPE - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJPI - 1º grau', label: 'PJE TJPI - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJPR - 1º grau', label: 'PJE TJPR - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJRJ - 1º grau', label: 'PJE TJRJ - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJRN - 1º grau', label: 'PJE TJRN - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJRO - 1º grau', label: 'PJE TJRO - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJRR - 1º grau', label: 'PJE TJRR - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJRS - 1º grau', label: 'PJE TJRS - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJSC - 1º grau', label: 'PJE TJSC - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJSE - 1º grau', label: 'PJE TJSE - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJSP - 1º grau', label: 'PJE TJSP - 1º grau', category: 'PJE Estadual 1º Grau' },
  { value: 'PJE TJTO - 1º grau', label: 'PJE TJTO - 1º grau', category: 'PJE Estadual 1º Grau' },
  
  // PJE - Tribunais Estaduais 2º Grau
  { value: 'PJE TJAC - 2º grau', label: 'PJE TJAC - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJAL - 2º grau', label: 'PJE TJAL - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJAM - 2º grau', label: 'PJE TJAM - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJAP - 2º grau', label: 'PJE TJAP - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJBA - 2º grau', label: 'PJE TJBA - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJCE - 2º grau', label: 'PJE TJCE - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJDFT - 2º grau', label: 'PJE TJDFT - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJES - 2º grau', label: 'PJE TJES - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJGO - 2º grau', label: 'PJE TJGO - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJMA - 2º grau', label: 'PJE TJMA - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJMG - 2º grau', label: 'PJE TJMG - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJMS - 2º grau', label: 'PJE TJMS - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJMT - 2º grau', label: 'PJE TJMT - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJPA - 2º grau', label: 'PJE TJPA - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJPB - 2º grau', label: 'PJE TJPB - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJPE - 2º grau', label: 'PJE TJPE - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJPI - 2º grau', label: 'PJE TJPI - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJPR - 2º grau', label: 'PJE TJPR - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJRJ - 2º grau', label: 'PJE TJRJ - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJRN - 2º grau', label: 'PJE TJRN - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJRO - 2º grau', label: 'PJE TJRO - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJRR - 2º grau', label: 'PJE TJRR - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJRS - 2º grau', label: 'PJE TJRS - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJSC - 2º grau', label: 'PJE TJSC - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJSE - 2º grau', label: 'PJE TJSE - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJSP - 2º grau', label: 'PJE TJSP - 2º grau', category: 'PJE Estadual 2º Grau' },
  { value: 'PJE TJTO - 2º grau', label: 'PJE TJTO - 2º grau', category: 'PJE Estadual 2º Grau' },
  
  // PJEINTER - Integração Estadual
  { value: 'PJEINTER TJAP', label: 'PJEINTER TJAP', category: 'PJEINTER' },
  { value: 'PJEINTER TJBA', label: 'PJEINTER TJBA', category: 'PJEINTER' },
  { value: 'PJEINTER TJES', label: 'PJEINTER TJES', category: 'PJEINTER' },
  { value: 'PJEINTER TJMT', label: 'PJEINTER TJMT', category: 'PJEINTER' },
  { value: 'PJEINTER TJPB', label: 'PJEINTER TJPB', category: 'PJEINTER' },
  { value: 'PJEINTER TJRJ', label: 'PJEINTER TJRJ', category: 'PJEINTER' },
  { value: 'PJEINTER TJRO', label: 'PJEINTER TJRO', category: 'PJEINTER' },
  { value: 'PJEINTER TJRR', label: 'PJEINTER TJRR', category: 'PJEINTER' },
  
  // PJE - TRF (Tribunais Regionais Federais)
  { value: 'PJE TRF1 - 1º grau', label: 'PJE TRF1 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF1 - 2º grau', label: 'PJE TRF1 - 2º grau', category: 'PJE TRF' },
  { value: 'PJE TRF2 - 1º grau', label: 'PJE TRF2 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF2 - 2º grau', label: 'PJE TRF2 - 2º grau', category: 'PJE TRF' },
  { value: 'PJE TRF3 - 1º grau', label: 'PJE TRF3 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF3 - 2º grau', label: 'PJE TRF3 - 2º grau', category: 'PJE TRF' },
  { value: 'PJE TRF4 - 1º grau', label: 'PJE TRF4 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF4 - 2º grau', label: 'PJE TRF4 - 2º grau', category: 'PJE TRF' },
  { value: 'PJE TRF5 - 1º grau', label: 'PJE TRF5 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF5 - 2º grau', label: 'PJE TRF5 - 2º grau', category: 'PJE TRF' },
  { value: 'PJE TRF6 - 1º grau', label: 'PJE TRF6 - 1º grau', category: 'PJE TRF' },
  { value: 'PJE TRF6 - 2º grau', label: 'PJE TRF6 - 2º grau', category: 'PJE TRF' },
  
  // PJE - TRT (Tribunais Regionais do Trabalho)
  { value: 'PJE TRT1 - RJ - 1º grau', label: 'PJE TRT1 - RJ - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT1 - RJ - 2º grau', label: 'PJE TRT1 - RJ - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT2 - SP - 1º grau', label: 'PJE TRT2 - SP - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT2 - SP - 2º grau', label: 'PJE TRT2 - SP - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT3 - MG - 1º grau', label: 'PJE TRT3 - MG - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT3 - MG - 2º grau', label: 'PJE TRT3 - MG - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT4 - RS - 1º grau', label: 'PJE TRT4 - RS - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT4 - RS - 2º grau', label: 'PJE TRT4 - RS - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT5 - BA - 1º grau', label: 'PJE TRT5 - BA - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT5 - BA - 2º grau', label: 'PJE TRT5 - BA - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT6 - PE - 1º grau', label: 'PJE TRT6 - PE - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT6 - PE - 2º grau', label: 'PJE TRT6 - PE - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT7 - CE - 1º grau', label: 'PJE TRT7 - CE - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT7 - CE - 2º grau', label: 'PJE TRT7 - CE - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT8 - PA/AP - 1º grau', label: 'PJE TRT8 - PA/AP - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT8 - PA/AP - 2º grau', label: 'PJE TRT8 - PA/AP - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT9 - PR - 1º grau', label: 'PJE TRT9 - PR - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT9 - PR - 2º grau', label: 'PJE TRT9 - PR - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT10 - DF/TO - 1º grau', label: 'PJE TRT10 - DF/TO - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT10 - DF/TO - 2º grau', label: 'PJE TRT10 - DF/TO - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT11 - AM/RR - 1º grau', label: 'PJE TRT11 - AM/RR - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT11 - AM/RR - 2º grau', label: 'PJE TRT11 - AM/RR - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT12 - SC - 1º grau', label: 'PJE TRT12 - SC - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT12 - SC - 2º grau', label: 'PJE TRT12 - SC - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT13 - PB - 1º grau', label: 'PJE TRT13 - PB - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT13 - PB - 2º grau', label: 'PJE TRT13 - PB - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT14 - AC/RO - 1º grau', label: 'PJE TRT14 - AC/RO - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT14 - AC/RO - 2º grau', label: 'PJE TRT14 - AC/RO - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT15 - Campinas - 1º grau', label: 'PJE TRT15 - Campinas - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT15 - Campinas - 2º grau', label: 'PJE TRT15 - Campinas - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT16 - MA - 1º grau', label: 'PJE TRT16 - MA - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT16 - MA - 2º grau', label: 'PJE TRT16 - MA - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT17 - ES - 1º grau', label: 'PJE TRT17 - ES - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT17 - ES - 2º grau', label: 'PJE TRT17 - ES - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT18 - GO - 1º grau', label: 'PJE TRT18 - GO - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT18 - GO - 2º grau', label: 'PJE TRT18 - GO - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT19 - AL - 1º grau', label: 'PJE TRT19 - AL - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT19 - AL - 2º grau', label: 'PJE TRT19 - AL - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT20 - SE - 1º grau', label: 'PJE TRT20 - SE - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT20 - SE - 2º grau', label: 'PJE TRT20 - SE - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT21 - RN - 1º grau', label: 'PJE TRT21 - RN - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT21 - RN - 2º grau', label: 'PJE TRT21 - RN - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT22 - PI - 1º grau', label: 'PJE TRT22 - PI - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT22 - PI - 2º grau', label: 'PJE TRT22 - PI - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT23 - MT - 1º grau', label: 'PJE TRT23 - MT - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT23 - MT - 2º grau', label: 'PJE TRT23 - MT - 2º grau', category: 'PJE TRT' },
  { value: 'PJE TRT24 - MS - 1º grau', label: 'PJE TRT24 - MS - 1º grau', category: 'PJE TRT' },
  { value: 'PJE TRT24 - MS - 2º grau', label: 'PJE TRT24 - MS - 2º grau', category: 'PJE TRT' },
  
  // PJE - TST (Tribunal Superior do Trabalho)
  { value: 'PJE TST - 1º grau', label: 'PJE TST - 1º grau', category: 'PJE TST' },
  { value: 'PJE TST - 2º grau', label: 'PJE TST - 2º grau', category: 'PJE TST' },
  { value: 'PJE TST - 3º grau', label: 'PJE TST - 3º grau', category: 'PJE TST' },
  
  // ESAJ - 1º Grau
  { value: 'ESAJ - TJSP - 1º grau', label: 'ESAJ - TJSP - 1º grau', category: 'ESAJ 1º Grau' },
  { value: 'ESAJ - TJMS - 1º grau', label: 'ESAJ - TJMS - 1º grau', category: 'ESAJ 1º Grau' },
  { value: 'ESAJ - TJAM - 1º grau', label: 'ESAJ - TJAM - 1º grau', category: 'ESAJ 1º Grau' },
  { value: 'ESAJ - TJCE - 1º grau', label: 'ESAJ - TJCE - 1º grau', category: 'ESAJ 1º Grau' },
  { value: 'ESAJ - TJAC - 1º grau', label: 'ESAJ - TJAC - 1º grau', category: 'ESAJ 1º Grau' },
  { value: 'ESAJ - TJAL - 1º grau', label: 'ESAJ - TJAL - 1º grau', category: 'ESAJ 1º Grau' },
  
  // ESAJ - 2º Grau
  { value: 'ESAJ - TJSP - 2º grau', label: 'ESAJ - TJSP - 2º grau', category: 'ESAJ 2º Grau' },
  { value: 'ESAJ - TJMS - 2º grau', label: 'ESAJ - TJMS - 2º grau', category: 'ESAJ 2º Grau' },
  { value: 'ESAJ - TJAM - 2º grau', label: 'ESAJ - TJAM - 2º grau', category: 'ESAJ 2º Grau' },
  { value: 'ESAJ - TJCE - 2º grau', label: 'ESAJ - TJCE - 2º grau', category: 'ESAJ 2º Grau' },
  { value: 'ESAJ - TJAC - 2º grau', label: 'ESAJ - TJAC - 2º grau', category: 'ESAJ 2º Grau' },
  { value: 'ESAJ - TJAL - 2º grau', label: 'ESAJ - TJAL - 2º grau', category: 'ESAJ 2º Grau' },
  
  // PROJUDI
  { value: 'PROJUDI TJPR - 1º grau', label: 'PROJUDI TJPR - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJPR - 2º grau', label: 'PROJUDI TJPR - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJGO - 1º grau', label: 'PROJUDI TJGO - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJGO - 2º grau', label: 'PROJUDI TJGO - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJMT - 1º grau', label: 'PROJUDI TJMT - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJMT - 2º grau', label: 'PROJUDI TJMT - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJBA - 1º grau', label: 'PROJUDI TJBA - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJBA - 2º grau', label: 'PROJUDI TJBA - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJRN - 1º grau', label: 'PROJUDI TJRN - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJRN - 2º grau', label: 'PROJUDI TJRN - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJMG - 1º grau', label: 'PROJUDI TJMG - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJMG - 2º grau', label: 'PROJUDI TJMG - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJRR - 1º grau', label: 'PROJUDI TJRR - 1º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJRR - 2º grau', label: 'PROJUDI TJRR - 2º grau', category: 'PROJUDI' },
  { value: 'PROJUDI TJAM - 1º grau', label: 'PROJUDI TJAM - 1º grau', category: 'PROJUDI' },
  
  // EPROC
  { value: 'EPROC - TJRS - 1º grau', label: 'EPROC - TJRS - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJRS - 2º grau', label: 'EPROC - TJRS - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJSC - 1º grau', label: 'EPROC - TJSC - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJSC - 2º grau', label: 'EPROC - TJSC - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJTO - 1º grau', label: 'EPROC - TJTO - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJTO - 2º grau', label: 'EPROC - TJTO - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJAC - 1º grau', label: 'EPROC - TJAC - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJAC - 2º grau', label: 'EPROC - TJAC - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJMG - 1º grau', label: 'EPROC - TJMG - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJMG - 2º grau', label: 'EPROC - TJMG - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJRJ - 1º grau', label: 'EPROC - TJRJ - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJRJ - 2º grau', label: 'EPROC - TJRJ - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TJSP - 1º grau', label: 'EPROC - TJSP - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TJSP - 2º grau', label: 'EPROC - TJSP - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF1 - 1º grau', label: 'EPROC - TRF1 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF1 - 2º grau', label: 'EPROC - TRF1 - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF2 - 1º grau', label: 'EPROC - TRF2 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF2 - 2º grau', label: 'EPROC - TRF2 - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF3 - 1º grau', label: 'EPROC - TRF3 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF3 - 2º grau', label: 'EPROC - TRF3 - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF4 - 1º grau', label: 'EPROC - TRF4 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF4 - 2º grau', label: 'EPROC - TRF4 - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF5 - 1º grau', label: 'EPROC - TRF5 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF5 - 2º grau', label: 'EPROC - TRF5 - 2º grau', category: 'EPROC' },
  { value: 'EPROC - TRF6 - 1º grau', label: 'EPROC - TRF6 - 1º grau', category: 'EPROC' },
  { value: 'EPROC - TRF6 - 2º grau', label: 'EPROC - TRF6 - 2º grau', category: 'EPROC' },
  
  // Tribunais Superiores
  { value: 'STJ', label: 'STJ - Superior Tribunal de Justiça', category: 'Tribunais Superiores' },
  { value: 'STF', label: 'STF - Supremo Tribunal Federal', category: 'Tribunais Superiores' },
  
  // TJRJ (Sistema próprio)
  { value: 'TJRJ - 1º grau', label: 'TJRJ - 1º grau', category: 'Outros Sistemas' },
  { value: 'TJRJ - 2º grau', label: 'TJRJ - 2º grau', category: 'Outros Sistemas' },
  
  // Juizados
  { value: 'JEC TJSP', label: 'JEC TJSP - Juizado Especial Cível', category: 'Juizados' },
  { value: 'JEF TRF3', label: 'JEF TRF3 - Juizado Especial Federal', category: 'Juizados' },
  { value: 'JEF TRF4', label: 'JEF TRF4 - Juizado Especial Federal', category: 'Juizados' },
];

// Agrupar tribunais por categoria
export function getTribunaisPorCategoria(): Map<string, TribunalOption[]> {
  const grouped = new Map<string, TribunalOption[]>();
  
  TRIBUNAIS_CREDENCIAIS.forEach(tribunal => {
    const existing = grouped.get(tribunal.category) || [];
    existing.push(tribunal);
    grouped.set(tribunal.category, existing);
  });
  
  return grouped;
}

// Buscar tribunal pelo value
export function getTribunalByValue(value: string): TribunalOption | undefined {
  return TRIBUNAIS_CREDENCIAIS.find(t => t.value === value);
}
