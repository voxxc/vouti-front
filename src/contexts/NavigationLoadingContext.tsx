import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  navigateWithPrefetch: (path: string, prefetchFn?: () => Promise<void>) => Promise<void>;
  startLoading: () => void;
  stopLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | null>(null);

const NAVIGATION_TIMEOUT = 5000; // 5 seconds max

export const NavigationLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const { tenant: tenantSlug } = useParams<{ tenant: string }>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsNavigating(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const navigateWithPrefetch = useCallback(async (path: string, prefetchFn?: () => Promise<void>) => {
    // Construir path com tenant
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = tenantSlug ? `/${tenantSlug}/${cleanPath}` : `/${cleanPath}`;

    // Se não há função de prefetch, navegar diretamente
    if (!prefetchFn) {
      navigate(fullPath);
      return;
    }

    // Iniciar loading
    setIsNavigating(true);

    // Timeout de segurança - navega mesmo se prefetch demorar muito
    timeoutRef.current = setTimeout(() => {
      console.log('[Navigation] Timeout atingido, navegando de qualquer forma');
      setIsNavigating(false);
      navigate(fullPath);
    }, NAVIGATION_TIMEOUT);

    try {
      // Executar prefetch
      console.log('[Navigation] Iniciando prefetch para:', fullPath);
      await prefetchFn();
      console.log('[Navigation] Prefetch concluído, navegando');
      
      // Limpar timeout e navegar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsNavigating(false);
      navigate(fullPath);
    } catch (error) {
      console.error('[Navigation] Erro no prefetch:', error);
      
      // Em caso de erro, ainda navega
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsNavigating(false);
      navigate(fullPath);
    }
  }, [navigate, tenantSlug]);

  return (
    <NavigationLoadingContext.Provider value={{
      isNavigating,
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
      navigateWithPrefetch: async () => {},
      startLoading: () => {},
      stopLoading: () => {}
    };
  }
  return context;
};
