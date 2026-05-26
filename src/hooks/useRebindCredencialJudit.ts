import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RebindParams {
  customerKey?: string;
  cnjPattern?: string;
  oabIds?: string[];
  batchSize?: number;
  tenantId?: string;
  historyLimit?: number;
}

export type RebindMode = 'count' | 'dry' | 'run' | 'listOabs' | 'history';

export const useRebindCredencialJudit = () => {
  const [running, setRunning] = useState(false);

  const invoke = useCallback(
    async (params: RebindParams, mode: RebindMode) => {
      const effectiveTenantId = params.tenantId;
      if (!effectiveTenantId) return null;
      setRunning(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'judit-rebind-credencial-lote',
          {
            body: {
              tenantId: effectiveTenantId,
              customerKey: params.customerKey,
              cnjPattern: params.cnjPattern,
              oabIds: params.oabIds ?? [],
              batchSize: params.batchSize ?? 10,
              countOnly: mode === 'count',
              dryRun: mode === 'dry',
              listOabs: mode === 'listOabs',
              history: mode === 'history',
              historyLimit: params.historyLimit,
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
    [],
  );

  return { running, invoke };
};