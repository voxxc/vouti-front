import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from '@/hooks/use-toast';

export interface RebindParams {
  customerKey: string;
  cnjPattern: string;
  oabIds: string[];
  batchSize?: number;
}

export const useRebindCredencialJudit = () => {
  const { tenantId } = useTenantId();
  const [running, setRunning] = useState(false);

  const invoke = useCallback(
    async (params: RebindParams, mode: 'count' | 'dry' | 'run') => {
      if (!tenantId) return null;
      setRunning(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'judit-rebind-credencial-lote',
          {
            body: {
              tenantId,
              customerKey: params.customerKey,
              cnjPattern: params.cnjPattern,
              oabIds: params.oabIds,
              batchSize: params.batchSize ?? 10,
              countOnly: mode === 'count',
              dryRun: mode === 'dry',
            },
          },
        );
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || 'Falha');
        return data;
      } catch (e: any) {
        toast({
          title: 'Falha no rebind',
          description: e?.message ?? 'Erro desconhecido',
          variant: 'destructive',
        });
        return null;
      } finally {
        setRunning(false);
      }
    },
    [tenantId],
  );

  return { running, invoke };
};