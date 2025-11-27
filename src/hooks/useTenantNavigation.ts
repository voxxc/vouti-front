import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook para navegação tenant-aware
 * Automaticamente prefixará todas as rotas com o slug do tenant atual
 */
export const useTenantNavigation = () => {
  const navigate = useNavigate();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();

  const tenantNavigate = useCallback((path: string, options?: { replace?: boolean }) => {
    // Se a rota já começa com /, remove para evitar //
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Se temos um slug de tenant, prefixamos a rota
    if (tenantSlug) {
      navigate(`/${tenantSlug}/${cleanPath}`, options);
    } else {
      // Fallback para navegação sem tenant (compatibilidade)
      navigate(`/${cleanPath}`, options);
    }
  }, [navigate, tenantSlug]);

  const tenantPath = useCallback((path: string) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (tenantSlug) {
      return `/${tenantSlug}/${cleanPath}`;
    }
    return `/${cleanPath}`;
  }, [tenantSlug]);

  return {
    navigate: tenantNavigate,
    tenantPath,
    tenantSlug,
    // Exporta o navigate original para rotas absolutas
    absoluteNavigate: navigate,
  };
};
