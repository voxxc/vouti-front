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
}

export interface DeadlineFormData {
  title: string;
  description: string;
  date: Date;
  projectId: string;
}