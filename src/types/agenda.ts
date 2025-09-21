export interface Deadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  projectId: string;
  projectName: string;
  clientName: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeadlineFormData {
  title: string;
  description: string;
  date: Date;
  projectId: string;
}