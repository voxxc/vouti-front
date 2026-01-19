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
}

export interface DeadlineFormData {
  title: string;
  description: string;
  date: Date;
  projectId: string;
}
