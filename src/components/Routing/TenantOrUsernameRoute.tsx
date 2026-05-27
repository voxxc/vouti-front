import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LinkPublicProfile from '@/pages/LinkPublicProfile';

/**
 * Resolver para a rota /:slug
 * - Se o slug corresponde a um tenant ativo → redireciona para /:slug/auth
 *   (o PublicRoute do auth já manda para /dashboard quando há sessão)
 * - Caso contrário → renderiza o perfil público de Link-in-Bio
 */
const TenantOrUsernameRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<'loading' | 'tenant' | 'username'>('loading');

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setState('username');
      return;
    }

    supabase
      .rpc('get_tenant_by_slug', { p_slug: slug })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && Array.isArray(data) && data.length > 0 && data[0]?.is_active) {
          setState('tenant');
        } else {
          setState('username');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (state === 'tenant') {
    return <Navigate to={`/${slug}/auth`} replace />;
  }

  return <LinkPublicProfile />;
};

export default TenantOrUsernameRoute;