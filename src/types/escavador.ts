export interface ProcessoMonitoramentoEscavador {
  id: string;
  processo_id: string;
  monitoramento_ativo: boolean;
  callback_id?: string;
  escavador_id?: string;
  escavador_data?: any;
  classe?: string;
  assunto?: string;
  area?: string;
  tribunal?: string;
  data_distribuicao?: string;
  valor_causa?: number;
  ultima_consulta?: string;
  ultima_atualizacao?: string;
  total_atualizacoes: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessoAtualizacaoEscavador {
  id: string;
  processo_id: string;
  monitoramento_id: string;
  tipo_atualizacao: string;
  descricao: string;
  data_evento: string;
  dados_completos: any;
  lida: boolean;
  notificacao_enviada: boolean;
  created_at: string;
}
