export interface DentalProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  especialidade: string | null;
  crm: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalPaciente {
  id: string;
  user_id: string;
  cpf: string | null;
  data_nascimento: Date | null;
  telefone: string | null;
  endereco: string | null;
  convenio: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalConsulta {
  id: string;
  paciente_id: string;
  dentista_id: string;
  data_hora: Date;
  tipo: 'consulta' | 'retorno' | 'emergencia';
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada';
  observacoes: string | null;
  created_at: string;
}

export interface DentalProntuario {
  id: string;
  paciente_id: string;
  dentista_id: string;
  data_consulta: Date;
  anamnese: string | null;
  diagnostico: string | null;
  tratamento_realizado: string | null;
  proximas_etapas: string | null;
  created_at: string;
}
