import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTenantIdForUser } from './useTenantId';

export interface TarefaOAB {
  id: string;
  processo_oab_id: string;
  titulo: string;
  descricao: string | null;
  fase: string | null;
  data_execucao: string;
  observacoes: string | null;
  user_id: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovaTarefaData {
  titulo: string;
  descricao?: string;
  fase?: string;
  data_execucao: string;
  observacoes?: string;
}

export const useTarefasOAB = (processoOabId: string | null) => {
  const [tarefas, setTarefas] = useState<TarefaOAB[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTarefas = useCallback(async () => {
    if (!processoOabId) {
      setTarefas([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab_tarefas')
        .select('*')
        .eq('processo_oab_id', processoOabId)
        .order('data_execucao', { ascending: false });

      if (error) throw error;
      setTarefas((data as TarefaOAB[]) || []);
    } catch (error: any) {
      console.error('[useTarefasOAB] Erro ao buscar tarefas:', error);
    } finally {
      setLoading(false);
    }
  }, [processoOabId]);

  useEffect(() => {
    fetchTarefas();
  }, [fetchTarefas]);

  // Real-time subscription para atualizacoes automaticas
  useEffect(() => {
    if (!processoOabId) return;

    const channel = supabase
      .channel(`tarefas-oab-${processoOabId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processos_oab_tarefas',
          filter: `processo_oab_id=eq.${processoOabId}`
        },
        () => {
          fetchTarefas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processoOabId, fetchTarefas]);

  const adicionarTarefa = async (data: NovaTarefaData) => {
    if (!processoOabId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const tenantId = await getTenantIdForUser(user.id);

      const { data: novaTarefa, error } = await supabase
        .from('processos_oab_tarefas')
        .insert({
          processo_oab_id: processoOabId,
          titulo: data.titulo,
          descricao: data.descricao || null,
          fase: data.fase || null,
          data_execucao: data.data_execucao,
          observacoes: data.observacoes || null,
          user_id: user.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;

      setTarefas(prev => [novaTarefa as TarefaOAB, ...prev]);
      toast({ title: 'Tarefa adicionada' });
      return novaTarefa;
    } catch (error: any) {
      console.error('[useTarefasOAB] Erro ao adicionar tarefa:', error);
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const atualizarTarefa = async (tarefaId: string, data: Partial<NovaTarefaData>) => {
    try {
      const { error } = await supabase
        .from('processos_oab_tarefas')
        .update({
          titulo: data.titulo,
          descricao: data.descricao,
          fase: data.fase,
          data_execucao: data.data_execucao,
          observacoes: data.observacoes,
        })
        .eq('id', tarefaId);

      if (error) throw error;

      setTarefas(prev => prev.map(t => 
        t.id === tarefaId ? { ...t, ...data } as TarefaOAB : t
      ));
      toast({ title: 'Tarefa atualizada' });
      return true;
    } catch (error: any) {
      console.error('[useTarefasOAB] Erro ao atualizar:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const removerTarefa = async (tarefaId: string) => {
    try {
      const { error } = await supabase
        .from('processos_oab_tarefas')
        .delete()
        .eq('id', tarefaId);

      if (error) throw error;

      setTarefas(prev => prev.filter(t => t.id !== tarefaId));
      toast({ title: 'Tarefa removida' });
      return true;
    } catch (error: any) {
      console.error('[useTarefasOAB] Erro ao remover:', error);
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  return {
    tarefas,
    loading,
    fetchTarefas,
    adicionarTarefa,
    atualizarTarefa,
    removerTarefa,
  };
};
