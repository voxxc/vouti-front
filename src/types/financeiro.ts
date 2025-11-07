export interface ClienteParcela {
  id: string;
  cliente_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  metodo_pagamento?: string;
  comprovante_url?: string;
  observacoes?: string;
  grupo_descricao?: string;
  created_at: string;
  updated_at: string;
}

export interface ParcelaComentario {
  id: string;
  parcela_id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  updated_at: string;
  autor?: {
    full_name: string;
    email: string;
  };
}

export interface DadosBaixaPagamento {
  data_pagamento: string;
  metodo_pagamento: string;
  valor_pago: number;
  comprovante?: File;
  observacoes?: string;
}

export interface ClienteDivida {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao?: string;
  valor_total: number;
  numero_parcelas: number;
  valor_parcela: number;
  data_inicio: string;
  data_vencimento_final?: string;
  status: 'ativo' | 'quitado' | 'cancelado';
  created_at: string;
  updated_at: string;
}

export interface CreateDividaData {
  titulo: string;
  descricao?: string;
  valor_total: number;
  numero_parcelas: number;
  data_inicio: string;
}
