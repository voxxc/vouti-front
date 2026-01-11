import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email_domain: string | null;
  logo_url: string | null;
  is_active: boolean;
  system_type_id: string;
  settings: unknown;
  created_at: string;
  updated_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantSlug) {
        setLoading(false);
        setError('Tenant não especificado');
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .ilike('slug', tenantSlug)
          .single();

        if (fetchError) {
          console.error('Error fetching tenant:', fetchError);
          setError('Tenant não encontrado');
          setTenant(null);
          // Redirect to 404 after a short delay
          setTimeout(() => navigate('/not-found'), 100);
          return;
        }

        if (!data) {
          setError('Tenant não encontrado');
          setTenant(null);
          setTimeout(() => navigate('/not-found'), 100);
          return;
        }

        if (!data.is_active) {
          setError('Este sistema está temporariamente desativado');
          setTenant(null);
          return;
        }

        setTenant(data as Tenant);
        setError(null);
      } catch (err) {
        console.error('Error in fetchTenant:', err);
        setError('Erro ao carregar tenant');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug, navigate]);

  return (
    <TenantContext.Provider value={{ tenant, tenantSlug: tenantSlug || null, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

// HOC para envolver componentes que precisam de tenant
export const withTenant = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function WithTenantComponent(props: P) {
    const { loading, error, tenant } = useTenant();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      );
    }

    if (error || !tenant) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
            <p className="text-muted-foreground">{error || 'Tenant não encontrado'}</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
