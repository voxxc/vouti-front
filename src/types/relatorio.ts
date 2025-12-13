export interface EscopoReceitas {
  faturamento: boolean;
  pagos: boolean;
  pendentes: boolean;
  ativos: boolean;
  encerrados: boolean;
}

export interface EscopoInadimplencia {
  total: boolean;
  clientes: boolean;
  contratos: boolean;
  percentual: boolean;
}

export interface EscopoCustos {
  operacionais: boolean;
  fixos: boolean;
  variaveis: boolean;
  compras: boolean;
  servicos: boolean;
}

export interface EscopoColaboradores {
  salarios: boolean;
  vales: boolean;
  porColaborador: boolean;
  totalGeral: boolean;
}

export interface EscopoResumo {
  receita: boolean;
  despesa: boolean;
  resultado: boolean;
}

export interface RelatorioEscopo {
  receitas: EscopoReceitas;
  inadimplencia: EscopoInadimplencia;
  custos: EscopoCustos;
  colaboradores: EscopoColaboradores;
  resumo: EscopoResumo;
}

export interface RelatorioConfig {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  escopo: RelatorioEscopo;
  detalhamento: 'resumido' | 'detalhado' | 'analitico';
  formato: 'pdf' | 'excel' | 'csv';
}

export interface DadosEscritorio {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  responsavel: string | null;
  logo_url: string | null;
}

export interface ClienteReceita {
  id: string;
  nome: string;
  valorContrato: number;
  valorRecebido: number;
  valorPendente: number;
  dataFechamento: string;
  status: string;
}

export interface ClienteInadimplente {
  id: string;
  nome: string;
  valorEmAtraso: number;
  diasAtraso: number;
  contrato: string;
  parcelas: number;
}

export interface CustoItem {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  tipo: string;
}

export interface ColaboradorItem {
  id: string;
  nome: string;
  tipoVinculo: string;
  salario: number;
  vales: number;
  totalPago: number;
}

export interface DadosReceitas {
  faturamentoTotal: number;
  honorariosPagos: number;
  honorariosPendentes: number;
  contratosAtivos: number;
  contratosEncerrados: number;
  clientes: ClienteReceita[];
}

export interface DadosInadimplencia {
  totalInadimplente: number;
  percentualInadimplencia: number;
  quantidadeClientes: number;
  quantidadeContratos: number;
  clientes: ClienteInadimplente[];
}

export interface DadosCustos {
  totalOperacionais: number;
  totalFixos: number;
  totalVariaveis: number;
  totalCompras: number;
  totalServicos: number;
  totalGeral: number;
  itens: CustoItem[];
  porCategoria: { categoria: string; total: number; cor: string }[];
}

export interface DadosColaboradores {
  totalSalarios: number;
  totalVales: number;
  totalGeral: number;
  percentualFaturamento: number;
  colaboradores: ColaboradorItem[];
}

export interface ResumoFinanceiro {
  receitaTotal: number;
  receitaRecebida: number;
  despesaTotal: number;
  resultado: number;
  tipo: 'lucro' | 'prejuizo' | 'neutro';
}

export interface DadosRelatorio {
  escritorio: DadosEscritorio;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  receitas: DadosReceitas;
  inadimplencia: DadosInadimplencia;
  custos: DadosCustos;
  colaboradores: DadosColaboradores;
  resumo: ResumoFinanceiro;
  geradoEm: Date;
  geradoPor: string;
}
