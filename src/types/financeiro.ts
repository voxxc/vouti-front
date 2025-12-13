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
  grupos_parcelas?: {
    entrada?: {
      valor: number;
      data_vencimento: string;
    };
    grupos: {
      ordem: number;
      descricao?: string;
      quantidade: number;
      valor_parcela: number;
      data_inicio: string;
    }[];
  };
}

// ============= COLABORADORES =============

export interface Colaborador {
  id: string;
  tenant_id?: string;
  user_id: string;
  nome_completo: string;
  tipo_pessoa: 'PF' | 'PJ';
  cpf_cnpj?: string;
  cargo?: string;
  tipo_vinculo?: 'CLT' | 'PJ' | 'Estagio' | 'Freelancer';
  salario_base: number;
  forma_pagamento: 'mensal' | 'hora' | 'demanda';
  dia_pagamento?: number;
  status: 'ativo' | 'inativo';
  data_contratacao?: string;
  data_nascimento?: string;
  endereco?: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorReajuste {
  id: string;
  colaborador_id: string;
  tenant_id?: string;
  valor_anterior: number;
  valor_novo: number;
  data_reajuste: string;
  motivo?: string;
  user_id: string;
  created_at: string;
}

export interface ColaboradorVale {
  id: string;
  colaborador_id: string;
  tenant_id?: string;
  tipo: 'vale' | 'adiantamento' | 'reembolso';
  valor: number;
  data: string;
  descricao?: string;
  vincular_salario: boolean;
  status: 'pendente' | 'descontado';
  user_id: string;
  created_at: string;
}

export interface ColaboradorComentario {
  id: string;
  colaborador_id: string;
  tenant_id?: string;
  user_id: string;
  comentario: string;
  created_at: string;
  updated_at: string;
  autor?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ColaboradorDocumento {
  id: string;
  colaborador_id: string;
  tenant_id?: string;
  tipo_documento?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}

// ============= CUSTOS =============

export interface CustoCategoria {
  id: string;
  tenant_id?: string;
  nome: string;
  cor: string;
  padrao: boolean;
  created_at: string;
}

export interface Custo {
  id: string;
  tenant_id?: string;
  user_id: string;
  descricao: string;
  categoria_id?: string;
  categoria?: CustoCategoria;
  valor: number;
  tipo?: 'fixo' | 'variavel';
  data: string;
  forma_pagamento?: string;
  status: 'pago' | 'pendente';
  parcelado: boolean;
  numero_parcelas?: number;
  observacoes?: string;
  recorrente: boolean;
  periodicidade?: string;
  data_inicial?: string;
  data_final?: string;
  created_at: string;
  updated_at: string;
}

export interface CustoParcela {
  id: string;
  custo_id: string;
  tenant_id?: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  created_at: string;
}

export interface CustoComprovante {
  id: string;
  custo_id: string;
  tenant_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}
