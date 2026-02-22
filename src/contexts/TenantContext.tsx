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
        // First try: authenticated full query (works if user is logged in)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data, error: fetchError } = await supabase
            .from('tenants')
            .select('*')
            .ilike('slug', tenantSlug)
            .single();

          if (!fetchError && data) {
            if (!data.is_active) {
              setError('Este sistema está temporariamente desativado');
              setTenant(null);
              setLoading(false);
              return;
            }
            setTenant(data as Tenant);
            setError(null);
            setLoading(false);
            return;
          }
        }

        // Fallback: use RPC for pre-auth (returns only id, slug, is_active, system_type_id)
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_tenant_by_slug', { p_slug: tenantSlug });

        if (rpcError || !rpcData || rpcData.length === 0) {
          console.error('Error fetching tenant:', rpcError);
          setError('Tenant não encontrado');
          setTenant(null);
          setTimeout(() => navigate('/not-found'), 100);
          return;
        }

        const minimalTenant = rpcData[0];
        // Set partial tenant data (enough for routing/auth pages)
        setTenant({
          id: minimalTenant.id,
          slug: minimalTenant.slug,
          is_active: minimalTenant.is_active,
          system_type_id: minimalTenant.system_type_id,
          name: '',
          email_domain: null,
          logo_url: null,
          settings: null,
          created_at: '',
          updated_at: '',
        } as Tenant);
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

  // After authentication, reload full tenant data
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && tenantSlug && tenant && !tenant.name) {
        const { data } = await supabase
          .from('tenants')
          .select('*')
          .ilike('slug', tenantSlug)
          .single();
        if (data) {
          setTenant(data as Tenant);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [tenantSlug, tenant]);

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
