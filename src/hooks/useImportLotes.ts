import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportLote {
  id: string;
  tenant_id: string;
  oab_id: string;
  criado_por: string;
  nome_arquivo: string | null;
  total_linhas: number;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Agregados
  total_concluidos?: number;
  total_duplicados?: number;
  total_falhas?: number;
  total_pendentes?: number;
}

export interface ImportJob {
  id: string;
  lote_id: string;
  tenant_id: string;
  oab_id: string;
  linha_planilha: number;
  numero_cnj: string;
  dados_planilha: any;
  status: string;
  tentativas_processo: number;
  tentativas_andamentos: number;
  processo_id: string | null;
  andamentos_inseridos: number | null;
  erro_mensagem: string | null;
  proximo_retry_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

export function useImportLotes() {
  const { tenantId } = useAuth();
  const [lotes, setLotes] = useState<ImportLote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLotes = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: lotesData, error } = await supabase
      .from('processo_import_lotes' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[useImportLotes]', error);
      setLoading(false);
      return;
    }

    const loteIds = (lotesData || []).map((l: any) => l.id);
    let agg: Record<string, any> = {};
    if (loteIds.length > 0) {
      const { data: jobsData } = await supabase
        .from('processo_import_jobs' as any)
        .select('lote_id, status')
        .in('lote_id', loteIds);
      (jobsData || []).forEach((j: any) => {
        if (!agg[j.lote_id]) {
          agg[j.lote_id] = { c: 0, d: 0, f: 0, p: 0 };
        }
        if (j.status === 'concluido') agg[j.lote_id].c++;
        else if (j.status === 'duplicado') agg[j.lote_id].d++;
        else if (j.status?.startsWith('falha_')) agg[j.lote_id].f++;
        else agg[j.lote_id].p++;
      });
    }

    const enriched = (lotesData || []).map((l: any) => ({
      ...l,
      total_concluidos: agg[l.id]?.c ?? 0,
      total_duplicados: agg[l.id]?.d ?? 0,
      total_falhas: agg[l.id]?.f ?? 0,
      total_pendentes: agg[l.id]?.p ?? 0,
    }));

    setLotes(enriched as ImportLote[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel('import-lotes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processo_import_lotes', filter: `tenant_id=eq.${tenantId}` },
        () => fetchLotes()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processo_import_jobs', filter: `tenant_id=eq.${tenantId}` },
        () => fetchLotes()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchLotes]);

  return { lotes, loading, refetch: fetchLotes };
}

export function useImportJobs(loteId: string | null) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!loteId) {
      setJobs([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('processo_import_jobs' as any)
      .select('*')
      .eq('lote_id', loteId)
      .order('linha_planilha', { ascending: true });
    if (!error) setJobs((data as any) || []);
    setLoading(false);
  }, [loteId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!loteId) return;
    const channel = supabase
      .channel(`import-jobs-${loteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processo_import_jobs', filter: `lote_id=eq.${loteId}` },
        () => fetchJobs()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loteId, fetchJobs]);

  return { jobs, loading, refetch: fetchJobs };
}