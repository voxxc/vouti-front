export interface EscopoReunioesLeads {
  leadsCadastrados: boolean;
  novosLeads: boolean;
}

export interface EscopoReunioesReunioes {
  agendadas: boolean;
  realizadas: boolean;
  fechadas: boolean;
  emContato: boolean;
  inviaveis: boolean;
}

export interface EscopoReunioesPerformance {
  porUsuario: boolean;
  taxaConversao: boolean;
}

export interface RelatorioReunioesEscopo {
  leads: EscopoReunioesLeads;
  reunioes: EscopoReunioesReunioes;
  performance: EscopoReunioesPerformance;
}

export type AgrupamentoReunioes = 'usuario' | 'status' | 'dia';

export interface RelatorioReunioesConfig {
  periodo: { inicio: Date; fim: Date };
  escopo: RelatorioReunioesEscopo;
  agrupamento: AgrupamentoReunioes;
  formato: 'pdf' | 'excel' | 'csv';
}

export interface LeadRelatorio {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  status: string | null;
  dataCadastro: string;
  responsavel: string | null;
}

export interface ReuniaoRelatorio {
  id: string;
  data: string;
  cliente: string;
  usuario: string;
  status: string;
  resultado: string | null;
  observacoes: string | null;
}

export interface PerformanceUsuarioRelatorio {
  userId: string;
  userName: string;
  reunioesAgendadas: number;
  reunioesFechadas: number;
  taxaConversao: number;
}

export interface DadosRelatorioReunioes {
  escritorio: {
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    responsavel: string | null;
  };
  periodo: { inicio: Date; fim: Date };
  resumo: {
    totalLeads: number;
    novosLeads: number;
    totalReunioes: number;
    reunioesFechadas: number;
    taxaConversao: number;
  };
  leads: LeadRelatorio[];
  reunioes: ReuniaoRelatorio[];
  performanceUsuarios: PerformanceUsuarioRelatorio[];
  geradoPor: string;
  dataGeracao: Date;
}
