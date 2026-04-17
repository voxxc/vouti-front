import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Conta processos sem detalhes_request_id agrupado por tenant.
 * Retorna Record<tenant_id, count>.
 */
export function useIncompleteProcessosCount() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    try {
      // Busca todas as linhas com detalhes_request_id null e numero_cnj não nulo
      // Limit alto pois super admin precisa ver tudo. Se ficar pesado, virar RPC.
      const { data, error } = await supabase
        .from('processos_oab')
        .select('tenant_id')
        .is('detalhes_request_id', null)
        .not('numero_cnj', 'is', null)
        .limit(10000);

      if (error) throw error;

      const grouped: Record<string, number> = {};
      (data || []).forEach((row) => {
        if (row.tenant_id) {
          grouped[row.tenant_id] = (grouped[row.tenant_id] || 0) + 1;
        }
      });
      setCounts(grouped);
    } catch (err) {
      console.error('[useIncompleteProcessosCount] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, refetch: fetchCounts };
}
