import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  prefetchAllPagesAfterLogin,
  prefetchControladoriaListasSilent,
} from '@/hooks/usePrefetchPages';

const SECTIONS_FOR_CONTROLADORIA = ['admin', 'advogado', 'controller', 'estagiario'];

/**
 * Dispara prefetch silencioso após login para aquecer caches
 * (KPIs do Dashboard/Projects/Controladoria + listas pesadas da Controladoria).
 * Executa em idle para não competir com o render inicial.
 */
export const BackgroundPrefetcher = () => {
  const queryClient = useQueryClient();
  const { user, tenantId, userRoles, loading } = useAuth();
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.id || !tenantId) return;
    if (firedRef.current === user.id) return;
    firedRef.current = user.id;

    const canAccessControladoria = userRoles.some((r) =>
      SECTIONS_FOR_CONTROLADORIA.includes(r)
    );

    const run = () => {
      prefetchAllPagesAfterLogin(queryClient, tenantId, user.id).catch(() => {});
      if (canAccessControladoria) {
        prefetchControladoriaListasSilent(tenantId).catch(() => {});
      }
    };

    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(run, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 1500);
    return () => window.clearTimeout(t);
  }, [queryClient, user?.id, tenantId, userRoles, loading]);

  return null;
};
