import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessoSigiloso {
  id: string;
  numero_cnj: string;
  parte_ativa: string | null;
  parte_passiva: string | null;
  oab_id: string | null;
  tribunal_sigla: string | null;
  secrecy_level: number;
  monitoramento_ativo: boolean;
  ultima_atualizacao_detalhes: string | null;
  created_at: string;
}

export function useTenantProcessosSigilosos(tenantId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['tenant-processos-sigilosos', tenantId],
    enabled: !!tenantId && enabled,
    queryFn: async (): Promise<ProcessoSigiloso[]> => {
      const { data, error } = await supabase.rpc('get_tenant_processos_sigilosos', {
        p_tenant_id: tenantId!,
      });
      if (error) throw error;
      return (data || []) as ProcessoSigiloso[];
    },
  });
}