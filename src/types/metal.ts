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
  data_entrada: string;
  produto: string;
  dimensoes: string | null;
  material: string | null;
  acabamento: string | null;
  cliente: string;
  pedido: string | null;
  item: string | null;
  quantidade: number;
  desenhista: string | null;
  ficha_tecnica_url: string | null;
  ficha_tecnica_rotation: number;
  status: string;
  setor_atual: string | null;
  data_prevista_saida: string | null;
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
