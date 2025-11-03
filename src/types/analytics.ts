export interface ClienteAnalytics {
  totalClientes: number;
  clientesAtivos: number;
  clientesInativos: number;
  clientesEncerrados: number;
  distribuicaoProfissoes: ProfissaoData[];
  distribuicaoIdades: IdadeData[];
  distribuicaoRegioes: RegiaoData[];
  distribuicaoClassificacao: ClassificacaoData[];
  valorTotalContratos: number;
  ticketMedio: number;
}

export interface ProfissaoData {
  profissao: string;
  count: number;
  percentage: number;
}

export interface IdadeData {
  faixaEtaria: string;
  count: number;
  percentage: number;
}

export interface RegiaoData {
  uf: string;
  cidade?: string;
  count: number;
  percentage: number;
}

export interface ClassificacaoData {
  tipo: 'pf' | 'pj';
  count: number;
  percentage: number;
}
