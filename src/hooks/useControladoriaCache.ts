import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OABCadastrada } from './useOABs';
import { getTenantIdForUser } from './useTenantId';

const CACHE_KEY = 'controladoria_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos

interface ControladoriaMetrics {
  totalProcessos: number;
  totalOABs: number;
  monitorados: number;
  totalCNPJs: number;
  cnpjsMonitorados: number;
}

interface ControladoriaCache {
  metrics: ControladoriaMetrics;
  oabs: OABCadastrada[];
  lastUpdated: number;
}

interface UseControladoriaCache {
  metrics: ControladoriaMetrics;
  oabs: OABCadastrada[];
  loading: boolean;
  isCacheLoaded: boolean;
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
  invalidateCache: () => void;
}

const defaultMetrics: ControladoriaMetrics = {
  totalProcessos: 0,
  totalOABs: 0,
  monitorados: 0,
  totalCNPJs: 0,
  cnpjsMonitorados: 0
};

// Função para carregar cache do localStorage
const loadFromLocalStorage = (): ControladoriaCache | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as ControladoriaCache;
    
    // Verificar se cache expirou
    if (Date.now() - parsed.lastUpdated > CACHE_EXPIRY_MS) {
      console.log('[Cache] Cache expirado, será atualizado em background');
    }
    
    return parsed;
  } catch (error) {
    console.error('[Cache] Erro ao carregar cache:', error);
    return null;
  }
};

// Função para salvar cache no localStorage
const saveToLocalStorage = (data: ControladoriaCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[Cache] Erro ao salvar cache:', error);
  }
};

// Função para buscar métricas (otimizada com query única)
const fetchMetricsOptimized = async (): Promise<ControladoriaMetrics> => {
  const [
    { count: totalProcessos },
    { count: totalOABs },
    { count: monitorados },
    { count: totalCNPJs },
    { count: cnpjsMonitorados }
  ] = await Promise.all([
    supabase.from('processos_oab').select('*', { count: 'exact', head: true }),
    supabase.from('oabs_cadastradas').select('*', { count: 'exact', head: true }),
    supabase.from('processos_oab').select('*', { count: 'exact', head: true }).eq('monitoramento_ativo', true),
    supabase.from('cnpjs_cadastrados').select('*', { count: 'exact', head: true }),
    supabase.from('processos_cnpj').select('*', { count: 'exact', head: true }).eq('monitoramento_ativo', true)
  ]);

  return {
    totalProcessos: totalProcessos || 0,
    totalOABs: totalOABs || 0,
    monitorados: monitorados || 0,
    totalCNPJs: totalCNPJs || 0,
    cnpjsMonitorados: cnpjsMonitorados || 0
  };
};

// Função para buscar OABs
const fetchOABsOptimized = async (userId: string): Promise<OABCadastrada[]> => {
  const tenantId = await getTenantIdForUser(userId);
  
  // Verificar role do usuário
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  const isAdminOrController = roleData?.some(r => 
    r.role === 'admin' || r.role === 'controller'
  );

  let query = supabase
    .from('oabs_cadastradas')
    .select('*')
    .order('ordem', { ascending: true });

  if (isAdminOrController && tenantId) {
    query = query.eq('tenant_id', tenantId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data as OABCadastrada[]) || [];
};

export const useControladoriaCache = (): UseControladoriaCache => {
  const [metrics, setMetrics] = useState<ControladoriaMetrics>(defaultMetrics);
  const [oabs, setOabs] = useState<OABCadastrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchedRef = useRef(false);

  // Carregar dados do cache e depois atualizar em background
  const loadData = useCallback(async () => {
    // Carregar cache imediatamente
    const cached = loadFromLocalStorage();
    if (cached) {
      setMetrics(cached.metrics);
      setOabs(cached.oabs);
      setIsCacheLoaded(true);
      setLoading(false);
      console.log('[Cache] Dados carregados do cache');
    }

    // Buscar dados frescos em background
    setIsRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const [freshMetrics, freshOabs] = await Promise.all([
        fetchMetricsOptimized(),
        fetchOABsOptimized(user.id)
      ]);

      setMetrics(freshMetrics);
      setOabs(freshOabs);
      setIsCacheLoaded(true);
      
      // Salvar no cache
      saveToLocalStorage({
        metrics: freshMetrics,
        oabs: freshOabs,
        lastUpdated: Date.now()
      });

      console.log('[Cache] Dados frescos carregados e salvos');
    } catch (error) {
      console.error('[Cache] Erro ao buscar dados frescos:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Força atualização dos dados
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [freshMetrics, freshOabs] = await Promise.all([
        fetchMetricsOptimized(),
        fetchOABsOptimized(user.id)
      ]);

      setMetrics(freshMetrics);
      setOabs(freshOabs);
      
      saveToLocalStorage({
        metrics: freshMetrics,
        oabs: freshOabs,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('[Cache] Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Invalida cache (para usar após alterações)
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    console.log('[Cache] Cache invalidado');
  }, []);

  // Carregar dados na montagem
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      loadData();
    }
  }, [loadData]);

  // Real-time subscriptions para atualizações automáticas
  useEffect(() => {
    const channel = supabase
      .channel('controladoria-realtime-cache')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oabs_cadastradas' },
        () => {
          console.log('[Cache] OAB alterada, atualizando...');
          refreshData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'processos_oab' },
        () => {
          console.log('[Cache] Novo processo, atualizando métricas...');
          fetchMetricsOptimized().then(setMetrics);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  return {
    metrics,
    oabs,
    loading,
    isCacheLoaded,
    isRefreshing,
    refreshData,
    invalidateCache
  };
};

// Função para pré-carregar dados (chamada após login)
export const prefetchControladoriaData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('[Prefetch] Iniciando pré-carregamento da Controladoria...');

    const [metrics, oabs] = await Promise.all([
      fetchMetricsOptimized(),
      fetchOABsOptimized(user.id)
    ]);

    saveToLocalStorage({
      metrics,
      oabs,
      lastUpdated: Date.now()
    });

    console.log('[Prefetch] Dados pré-carregados com sucesso');
  } catch (error) {
    console.error('[Prefetch] Erro no pré-carregamento:', error);
  }
};
