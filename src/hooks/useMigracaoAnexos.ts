import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from '@/hooks/use-toast';

export interface MigracaoStats {
  oabAtivos: number;
  oabMigrados: number;
  oabPendentes: number;
  cnpjAtivos: number;
  cnpjMigrados: number;
  cnpjPendentes: number;
  errosRecentes: number;
}

export interface MigracaoRegistro {
  id: string;
  processo_id: string;
  tipo: 'oab' | 'cnpj';
  tracking_id_antigo: string | null;
  tracking_id_novo: string | null;
  status: 'pendente' | 'migrado' | 'erro';
  erro: string | null;
  executado_em: string;
}

export const useMigracaoAnexos = () => {
  const { tenantId } = useTenantId();
  const [stats, setStats] = useState<MigracaoStats>({
    oabAtivos: 0,
    oabMigrados: 0,
    oabPendentes: 0,
    cnpjAtivos: 0,
    cnpjMigrados: 0,
    cnpjPendentes: 0,
    errosRecentes: 0,
  });
  const [historico, setHistorico] = useState<MigracaoRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [oabRes, cnpjRes, histRes] = await Promise.all([
        supabase
          .from('processos_oab')
          .select('with_attachments', { count: 'exact', head: false })
          .eq('tenant_id', tenantId)
          .eq('monitoramento_ativo', true)
          .not('tracking_id', 'is', null),
        supabase
          .from('cnpjs_cadastrados')
          .select('with_attachments', { count: 'exact', head: false })
          .eq('tenant_id', tenantId)
          .eq('monitoramento_ativo', true)
          .not('tracking_id', 'is', null),
        supabase
          .from('judit_migracao_attachments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('executado_em', { ascending: false })
          .limit(50),
      ]);

      const oab = oabRes.data || [];
      const cnpj = cnpjRes.data || [];
      const hist = (histRes.data || []) as MigracaoRegistro[];

      setStats({
        oabAtivos: oab.length,
        oabMigrados: oab.filter((p: any) => p.with_attachments).length,
        oabPendentes: oab.filter((p: any) => !p.with_attachments).length,
        cnpjAtivos: cnpj.length,
        cnpjMigrados: cnpj.filter((p: any) => p.with_attachments).length,
        cnpjPendentes: cnpj.filter((p: any) => !p.with_attachments).length,
        errosRecentes: hist.filter((h) => h.status === 'erro').length,
      });
      setHistorico(hist);
    } catch (e: any) {
      console.error('[useMigracaoAnexos] erro:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const migrarLote = useCallback(
    async (batchSize = 10) => {
      if (!tenantId) return;
      setRunning(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'judit-migrar-trackings-attachments',
          { body: { tenantId, batchSize, tipo: 'all' } },
        );
        if (error) throw error;
        const { processados = 0, migrados = 0, erros = 0 } = data || {};
        toast({
          title: 'Lote processado',
          description: `${migrados} migrados, ${erros} erros (de ${processados} tentados).`,
        });
        await carregar();
      } catch (e: any) {
        toast({
          title: 'Falha na migração',
          description: e?.message ?? 'Erro desconhecido',
          variant: 'destructive',
        });
      } finally {
        setRunning(false);
      }
    },
    [tenantId, carregar],
  );

  return { stats, historico, loading, running, carregar, migrarLote };
};