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
  // Campos de plano
  plano: string;
  limite_oabs_personalizado: number | null;
  // Joined data
  system_type?: SystemType;
}

export type PlanoCodigo = 'solo' | 'essencial' | 'estrutura' | 'expansao' | 'enterprise';

export interface PlanoConfig {
  id: string;
  codigo: PlanoCodigo;
  nome: string;
  valor_mensal: number;
  limite_oabs: number | null;
  limite_usuarios: number | null;
  limite_processos_cadastrados: number | null;
  limite_processos_monitorados: number | null;
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
  // Campos do plano
  plano: PlanoCodigo;
  limite_oabs_personalizado?: number;
  // Campos do primeiro administrador
  admin_email: string;
  admin_password: string;
  admin_name: string;
}
