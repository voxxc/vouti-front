export interface SystemType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  system_type_id: string;
  name: string;
  slug: string;
  email_domain: string | null;
  logo_url: string | null;
  is_active: boolean;
  settings: unknown;
  created_at: string;
  updated_at: string;
  // Joined data
  system_type?: SystemType;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export interface TenantFormData {
  name: string;
  slug: string;
  email_domain: string;
  system_type_id: string;
}
