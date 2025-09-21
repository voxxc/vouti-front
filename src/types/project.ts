export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'todo' | 'progress' | 'done';
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_STATUSES = {
  waiting: 'Em Espera',
  todo: 'A Fazer',
  progress: 'Andamento',
  done: 'Concluído'
} as const;