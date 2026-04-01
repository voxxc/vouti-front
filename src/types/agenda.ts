interface TaggedUser {
  userId: string;
  name: string;
  avatar?: string;
}

interface AdvogadoResponsavel {
  userId: string;
  name: string;
  avatar?: string;
}

// Origem: Processo Judicial
interface ProcessoOrigem {
  id: string;
  numeroCnj?: string;
  parteAtiva?: string;
  partePassiva?: string;
  tribunal?: string;
}

// Origem: Protocolo/Etapa
interface ProtocoloOrigem {
  etapaId: string;
  etapaNome?: string;
  protocoloNome?: string;
  projectId?: string;
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  projectId: string;
  projectName: string;
  clientName: string;
  completed: boolean;
  advogadoResponsavel?: AdvogadoResponsavel;
  taggedUsers?: TaggedUser[];
  processoOabId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Origem: Processo Judicial
  processoOrigem?: ProcessoOrigem;
  
  // Origem: Protocolo/Etapa
  protocoloOrigem?: ProtocoloOrigem;
  
  // Caso vinculado (quando o prazo vem de um Processo/Protocolo que está vinculado a um Caso)
  casoVinculado?: ProcessoOrigem;
  
  // Protocolo vinculado (quando o prazo vem de um Caso que está vinculado a um Processo/Protocolo)
  protocoloVinculado?: ProtocoloOrigem & { protocoloId?: string };
  
  // Workspace de origem (resolvido via protocolo ou processo)
  workspaceName?: string;
  workspaceId?: string;
  protocoloEtapaId?: string;
  
  // Quem criou e quem concluiu
  createdByUserId?: string;
  completedByUserId?: string;
  createdByName?: string;
  createdByAvatar?: string;
  completedByName?: string;
  completedByAvatar?: string;
  
  // Dados de conclusão
  comentarioConclusao?: string;
  concluidoEm?: Date;
  
  // Categoria do prazo (pericial)
  deadlineCategory?: string;
  
  // Numeração sequencial para auditoria
  deadlineNumber?: number;
}

export interface DeadlineFormData {
  title: string;
  description: string;
  date: Date;
  projectId: string;
  workspaceId?: string;
  processoOabId?: string;
  protocoloEtapaId?: string;
}
