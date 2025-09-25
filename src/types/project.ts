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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'todo' | 'progress' | 'done';
  comments: Comment[];
  files: TaskFile[];
  history: TaskHistoryEntry[];
  type?: 'regular' | 'acordo';
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