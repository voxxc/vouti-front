export type VotechRole = 'admin' | 'usuario' | 'contador';

export interface VotechProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  empresa: string | null;
  cargo: string | null;
  created_at: string;
  updated_at: string;
}

export interface VotechUserRole {
  id: string;
  user_id: string;
  role: VotechRole;
  created_at: string;
}

export interface VotechCategoria {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  nome: string;
  cor: string | null;
  icone: string | null;
  created_at: string;
}

export interface VotechTransacao {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  categoria_id: string | null;
  forma_pagamento: string | null;
  status: 'pago' | 'pendente';
  observacoes: string | null;
  recorrente: boolean;
  created_at: string;
  updated_at: string;
  categoria?: VotechCategoria;
}

export interface VotechConta {
  id: string;
  user_id: string;
  tipo: 'pagar' | 'receber';
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  categoria_id: string | null;
  fornecedor_cliente: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  categoria?: VotechCategoria;
}
