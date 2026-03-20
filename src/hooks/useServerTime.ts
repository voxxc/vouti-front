import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook que sincroniza o relógio do cliente com o servidor Supabase.
 * Retorna uma função getSyncedNow() que dá o timestamp corrigido.
 * 
 * Isso garante que todos os usuários usem a mesma referência de tempo
 * para gerar códigos TOTP, independente do relógio local.
 */
export function useServerTime(enabled: boolean) {
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const offsetRef = useRef(0);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const clientBefore = Date.now();
      
      // Usa uma query leve para pegar o horário do servidor
      const { data, error } = await supabase
        .rpc('get_server_time_ms');
      
      const clientAfter = Date.now();
      
      if (error || !data) {
        // Fallback: usar query simples
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tenants')
          .select('id')
          .limit(1);
        
        // Se mesmo o fallback falhar, usar relógio local (offset = 0)
        if (fallbackError) {
          console.warn('[useServerTime] Falha na sincronização, usando relógio local');
          setIsSynced(true);
          setIsSyncing(false);
          return;
        }
        
        // Sem RPC disponível, usar relógio local
        setIsSynced(true);
        setIsSyncing(false);
        return;
      }
      
      // Compensar latência da rede (round-trip / 2)
      const roundTripMs = clientAfter - clientBefore;
      const serverNowMs = Number(data);
      const estimatedClientAtServerTime = clientBefore + roundTripMs / 2;
      const newOffset = serverNowMs - estimatedClientAtServerTime;
      
      offsetRef.current = newOffset;
      setOffsetMs(newOffset);
      setIsSynced(true);
    } catch (err) {
      console.warn('[useServerTime] Erro na sincronização:', err);
      setIsSynced(true); // fallback para relógio local
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sincronizar quando habilitado
  useEffect(() => {
    if (!enabled) return;
    
    sync();
    
    // Recalibrar a cada 5 minutos
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, sync]);

  const getSyncedNow = useCallback(() => {
    return Date.now() + offsetRef.current;
  }, []);

  return { getSyncedNow, isSynced, isSyncing, offsetMs, resync: sync };
}
