import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  navigationId: number;
  navigateWithPrefetch: (path: string, prefetchFn?: () => Promise<void>) => void;
  startLoading: () => void;
  stopLoading: (navId?: number) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | null>(null);

// Timeout de segurança máximo (10 segundos) - overlay só some quando página sinaliza ou timeout
const NAVIGATION_TIMEOUT = 10000;

export const NavigationLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationId, setNavigationId] = useState(0);
  const navigate = useNavigate();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentNavIdRef = useRef(0);

  const startLoading = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const stopLoading = useCallback((navId?: number) => {
    // Se foi passado um navId, só para se for o atual (evita race conditions)
    if (navId !== undefined && navId !== currentNavIdRef.current) {
      return;
    }
    
    setIsNavigating(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const navigateWithPrefetch = useCallback((path: string, prefetchFn?: () => Promise<void>) => {
    // Construir path com tenant
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = tenantSlug ? `/${tenantSlug}/${cleanPath}` : `/${cleanPath}`;

    // Incrementar navigation ID
    const newNavId = navigationId + 1;
    setNavigationId(newNavId);
    currentNavIdRef.current = newNavId;

    // Se não há função de prefetch, navegar diretamente sem overlay
    if (!prefetchFn) {
      navigate(fullPath);
      return;
    }

    // Iniciar loading (overlay aparece)
    setIsNavigating(true);

    // Limpar timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Timeout de segurança - força parar o overlay após X segundos
    timeoutRef.current = setTimeout(() => {
      console.log('[Navigation] Timeout de segurança atingido');
      setIsNavigating(false);
    }, NAVIGATION_TIMEOUT);

    // Executar prefetch em background e navegar
    prefetchFn()
      .catch((error) => {
        console.error('[Navigation] Erro no prefetch:', error);
      })
      .finally(() => {
        // Navegar após prefetch (sucesso ou erro)
        // O overlay continua ativo até a página destino chamar stopLoading()
        navigate(fullPath);
      });
  }, [navigate, tenantSlug, navigationId]);

  return (
    <NavigationLoadingContext.Provider value={{
      isNavigating,
      navigationId,
      navigateWithPrefetch,
      startLoading,
      stopLoading
    }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
};

export const useNavigationLoading = () => {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    // Retornar fallback para rotas que não usam o provider
    return {
      isNavigating: false,
      navigationId: 0,
      navigateWithPrefetch: () => {},
      startLoading: () => {},
      stopLoading: () => {}
    };
  }
  return context;
};
