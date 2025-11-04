export type ReuniaoStatus = '1ª reunião' | 'em contato' | 'inviável' | 'fechado';

export interface Reuniao {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
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
