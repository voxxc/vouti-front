export type ReuniaoStatus = '1ª reunião' | 'em contato' | 'inviável' | 'fechado';
export type SituacaoAgenda = 'ativa' | 'desmarcada' | 'remarcada';

export interface ReuniaoStatusType {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  is_default: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReuniaoCliente {
  id: string;
  user_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
  origem?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  total_reunioes?: number;
  ultima_reuniao?: string;
  creator_name?: string;
  creator_email?: string;
}

export interface ReuniaoClienteFormData {
  nome: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}

export interface Reuniao {
  id: string;
  user_id: string;
  cliente_id?: string;
  titulo: string;
  descricao?: string;
  data: string;
  horario: string;
  duracao_minutos: number;
  cliente_nome?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  status: ReuniaoStatus;
  status_id?: string;
  observacoes?: string;
  situacao_agenda?: SituacaoAgenda;
  data_alteracao_situacao?: string;
  motivo_alteracao?: string;
  created_at: string;
  updated_at: string;
  cliente?: ReuniaoCliente;
  reuniao_status?: ReuniaoStatusType;
  criado_por_nome?: string;
}

export interface ReuniaoComentario {
  id: string;
  reuniao_id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ReuniaoFormData {
  cliente_id?: string;
  titulo: string;
  descricao?: string;
  data: string;
  horario: string;
  duracao_minutos: number;
  cliente_nome?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  status: ReuniaoStatus;
  observacoes?: string;
}

export const HORARIOS_DISPONIVEIS = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '10:40', '11:00',
  '11:20', '11:30', '11:45', '12:00',
  '12:50', '13:00', '13:30', '14:00',
  '14:30', '14:40', '15:00', '15:30',
  '15:40', '15:45', '16:00', '16:15',
  '16:30', '16:40', '17:00', '17:30',
  '18:00'
];

export const REUNIAO_STATUS_OPTIONS: ReuniaoStatus[] = [
  '1ª reunião',
  'em contato',
  'inviável',
  'fechado'
];

export interface ReuniaoClienteComentario {
  id: string;
  cliente_id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ReuniaoClienteArquivo {
  id: string;
  cliente_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type?: string;
  uploaded_by: string;
  created_at: string;
}

export interface ReuniaoArquivo {
  id: string;
  reuniao_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type?: string;
  uploaded_by: string;
  created_at: string;
}
