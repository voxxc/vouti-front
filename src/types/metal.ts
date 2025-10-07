export type MetalRole = 'admin' | 'operador';

export interface MetalProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  setor: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetalUserRole {
  id: string;
  user_id: string;
  role: MetalRole;
  created_at: string;
}

export interface MetalOP {
  id: string;
  numero_op: string;
  cliente: string;
  produto: string;
  quantidade: number;
  data_entrada: string;
  data_prevista_saida: string | null;
  status: string;
  setor_atual: string | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MetalSetorFlow {
  id: string;
  op_id: string;
  setor: string;
  entrada: string | null;
  saida: string | null;
  operador_entrada_id: string | null;
  operador_saida_id: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface MetalOPHistory {
  id: string;
  op_id: string;
  user_id: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}
