export interface ProjectSector {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sectorOrder: number;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanColumn {
  id: string;
  projectId: string;
  sectorId?: string;
  name: string;
  columnOrder: number;
  color: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface TaskHistoryEntry {
  id: string;
  action: 'created' | 'moved' | 'edited' | 'comment_added' | 'comment_edited' | 'comment_deleted' | 'file_uploaded' | 'file_deleted';
  details: string;
  user: string;
  timestamp: Date;
}

export interface AcordoDetails {
  contratoProcesso?: string;
  valorOriginal?: number;
  valorAtualizado?: number;
  banco?: string;
  aVista?: number;
  parcelado?: {
    entrada: number;
    parcelas: number;
    quantidadeParcelas: number;
  };
  honorarios?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'todo' | 'progress' | 'done';
  columnId?: string;
  sectorId?: string;
  comments: Comment[];
  files: TaskFile[];
  history: TaskHistoryEntry[];
  type?: 'regular' | 'acordo';
  acordoDetails?: AcordoDetails;
  cardColor?: 'default' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange' | 'red';
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  tasks: Task[];
  acordoTasks: Task[];
  columns?: KanbanColumn[];
  sectors?: ProjectSector[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_STATUSES = {
  waiting: 'Em Espera',
  todo: 'A Fazer',
  progress: 'Andamento',
  done: 'Concluído'
} as const;