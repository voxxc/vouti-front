export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'advogado' | 'comercial' | 'financeiro' | 'controller' | 'agenda';
  personalInfo?: {
    phone?: string;
    department?: string;
    bio?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}