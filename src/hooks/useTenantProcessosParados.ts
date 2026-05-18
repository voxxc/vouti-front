import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessoParado {
  id: string;
  numero_cnj: string;
  parte_ativa: string | null;
  parte_passiva: string | null;
  oab_id: string | null;
  tribunal_sigla: string | null;
  created_at: string;
  ultima_movimentacao: string | null;
  dias_sem_movimentacao: number;
}

export function useTenantProcessosParados(tenantId: string | null, dias: number, enabled: boolean) {
  return useQuery({
    queryKey: ['tenant-processos-parados', tenantId, dias],
    enabled: !!tenantId && enabled,
    queryFn: async (): Promise<ProcessoParado[]> => {
      const { data, error } = await supabase.rpc('get_tenant_processos_parados', {
        p_tenant_id: tenantId!,
        p_dias: dias,
      });
      if (error) throw error;
      return (data || []) as ProcessoParado[];
    },
  });
}
