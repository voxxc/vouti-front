export type VotechRole = 'admin' | 'usuario' | 'contador';

export interface VotechProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  empresa: string | null;
  cargo: string | null;
  created_at: string;
  updated_at: string;
}

export interface VotechUserRole {
  id: string;
  user_id: string;
  role: VotechRole;
  created_at: string;
}
