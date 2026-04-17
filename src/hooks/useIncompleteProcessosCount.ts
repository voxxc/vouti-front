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
      // RPC SECURITY DEFINER: super admin vê todos os tenants, usuário comum vê só o seu.
      const { data, error } = await supabase.rpc('get_incomplete_processos_count_by_tenant');

      if (error) throw error;

      const grouped: Record<string, number> = {};
      (data || []).forEach((row: { tenant_id: string; count: number }) => {
        if (row.tenant_id) {
          grouped[row.tenant_id] = Number(row.count) || 0;
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
