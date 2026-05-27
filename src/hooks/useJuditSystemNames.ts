import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JuditCredencial {
  id: string;
  system_name: string;
  customer_key: string;
  apelido: string | null;
}

/**
 * Lista credenciais Judit ativas do tenant, agrupadas para uso em
 * Selects (importação de processo, edição no drawer, etc.).
 * A opção "Público" (sem credencial) é tratada no consumidor.
 */
export const useJuditSystemNames = (tenantId: string | null | undefined) => {
  return useQuery({
    queryKey: ['judit-system-names', tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<JuditCredencial[]> => {
      const { data, error } = await supabase
        .from('credenciais_judit')
        .select('id, system_name, customer_key, apelido')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('apelido', { ascending: true, nullsFirst: false })
        .order('system_name', { ascending: true });

      if (error) throw error;
      return (data || []) as JuditCredencial[];
    },
  });
};