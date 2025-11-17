export interface ProcessoOAB {
  numero_cnj: string;
  tribunal: string;
  tribunal_acronym: string;
  parte_tipo: 'autor' | 'reu' | 'advogado';
  status_processual: string;
  fase_processual?: string;
  data_distribuicao?: string;
  valor_causa?: number;
  ultimos_andamentos: AndamentoOAB[];
  dados_completos: any;
}

export interface AndamentoOAB {
  data_movimentacao: string;
  tipo_movimentacao: string;
  descricao: string;
  dados_completos: any;
}

export interface BuscaOABHistorico {
  id: string;
  oab_numero: string;
  oab_uf: string;
  data_busca: string;
  total_processos_encontrados: number;
  resultado_completo: any;
}

export const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];
