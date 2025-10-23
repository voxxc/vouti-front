export type LinkRole = 'admin' | 'user';

export interface LinkProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme_color: string;
  created_at: string;
  updated_at: string;
}

export interface LinkCollection {
  id: string;
  profile_id: string;
  title: string;
  is_active: boolean;
  position: number;
  created_at: string;
}

export interface LinkItem {
  id: string;
  profile_id: string;
  title: string;
  url: string;
  icon: string | null;
  is_active: boolean;
  position: number;
  clicks: number;
  created_at: string;
  collection_id: string | null;
}

export interface LinkUserRole {
  id: string;
  user_id: string;
  role: LinkRole;
  created_at: string;
}
