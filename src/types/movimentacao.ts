export type StatusConferencia = 'pendente' | 'conferido' | 'em_revisao';

export interface ProcessoMovimentacao {
  id: string;
  processo_id: string;
  tipo: string;
  data_movimentacao: string;
  descricao: string;
  is_automated: boolean;
  status_conferencia: StatusConferencia;
  autor_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConferenciaMovimentacao {
  id: string;
  movimentacao_id: string;
  conferido: boolean;
  conferido_por?: string;
  conferido_em?: string;
  observacoes_conferencia?: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoComConferencia extends ProcessoMovimentacao {
  conferencia?: ConferenciaMovimentacao & {
    usuario?: {
      full_name: string;
      email: string;
    };
  };
}
