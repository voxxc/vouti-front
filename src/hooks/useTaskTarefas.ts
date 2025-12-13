import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskTarefa } from '@/types/taskTarefa';

interface NovaTarefaData {
  titulo: string;
  descricao?: string;
  fase?: string;
  data_execucao: string;
  observacoes?: string;
}

export const useTaskTarefas = (taskId: string | null) => {
  const [tarefas, setTarefas] = useState<TaskTarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, tenantId } = useAuth();

  const fetchTarefas = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_tarefas')
        .select('*')
        .eq('task_id', taskId)
        .order('data_execucao', { ascending: false });

      if (error) throw error;
      setTarefas((data || []).map(t => ({ ...t, origem: 'card' as const })));
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTarefas();
  }, [fetchTarefas]);

  const adicionarTarefa = async (novaTarefa: NovaTarefaData) => {
    if (!taskId || !user) return null;

    try {
      const { data, error } = await supabase
        .from('task_tarefas')
        .insert({
          task_id: taskId,
          titulo: novaTarefa.titulo,
          descricao: novaTarefa.descricao,
          fase: novaTarefa.fase,
          data_execucao: novaTarefa.data_execucao,
          observacoes: novaTarefa.observacoes,
          user_id: user.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico do card
      await supabase
        .from('task_history')
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: 'tarefa_added',
          details: `Tarefa adicionada: "${novaTarefa.titulo}"`,
          tenant_id: tenantId,
        });

      const tarefaComOrigem = { ...data, origem: 'card' as const };
      setTarefas(prev => [tarefaComOrigem, ...prev]);
      return tarefaComOrigem;
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      return null;
    }
  };

  const atualizarTarefa = async (tarefaId: string, dados: Partial<NovaTarefaData>) => {
    if (!taskId || !user) return null;

    try {
      const tarefaAtual = tarefas.find(t => t.id === tarefaId);
      
      const { data, error } = await supabase
        .from('task_tarefas')
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tarefaId)
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico do card
      await supabase
        .from('task_history')
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: 'tarefa_edited',
          details: `Tarefa editada: "${dados.titulo || tarefaAtual?.titulo || 'tarefa'}"`,
          tenant_id: tenantId,
        });

      setTarefas(prev =>
        prev.map(t => (t.id === tarefaId ? { ...data, origem: 'card' as const } : t))
      );
      return data;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return null;
    }
  };

  const removerTarefa = async (tarefaId: string) => {
    if (!taskId || !user) return false;

    try {
      const tarefaParaRemover = tarefas.find(t => t.id === tarefaId);
      
      const { error } = await supabase
        .from('task_tarefas')
        .delete()
        .eq('id', tarefaId);

      if (error) throw error;

      // Registrar no histórico do card
      await supabase
        .from('task_history')
        .insert({
          task_id: taskId,
          user_id: user.id,
          action: 'tarefa_deleted',
          details: `Tarefa removida: "${tarefaParaRemover?.titulo || 'tarefa'}"`,
          tenant_id: tenantId,
        });

      setTarefas(prev => prev.filter(t => t.id !== tarefaId));
      return true;
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
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
