export interface TaskTarefa {
  id: string;
  task_id: string;
  titulo: string;
  descricao?: string;
  fase?: string;
  data_execucao: string;
  observacoes?: string;
  user_id: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  origem?: 'card' | 'processo';
}
