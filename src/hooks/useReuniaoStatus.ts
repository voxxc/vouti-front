import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';

export interface ReuniaoStatusType {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  is_default: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useReuniaoStatus = () => {
  const { tenantId } = useTenantId();
  const [status, setStatus] = useState<ReuniaoStatusType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('reuniao_status')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setStatus(data || []);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      toast.error('Erro ao carregar status');
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async (nome: string, cor: string) => {
    try {
      const maxOrdem = Math.max(...status.map(s => s.ordem), 0);
      const { data, error } = await supabase
        .from('reuniao_status')
        .insert({ nome, cor, ordem: maxOrdem + 1, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      toast.success('Status criado com sucesso');
      fetchStatus();
      return data;
    } catch (error) {
      console.error('Erro ao criar status:', error);
      toast.error('Erro ao criar status');
      return null;
    }
  };

  const updateStatus = async (id: string, updates: Partial<ReuniaoStatusType>) => {
    try {
      const { error } = await supabase
        .from('reuniao_status')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Status atualizado com sucesso');
      fetchStatus();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const statusItem = status.find(s => s.id === id);
      if (statusItem?.is_default) {
        toast.error('Status padrão não pode ser excluído');
        return;
      }

      // Verifica se há reuniões usando este status
      const { count } = await supabase
        .from('reunioes')
        .select('*', { count: 'exact', head: true })
        .eq('status_id', id);

      if (count && count > 0) {
        toast.error(`Não é possível excluir. Existem ${count} reuniões usando este status.`);
        return;
      }

      const { error } = await supabase
        .from('reuniao_status')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Status excluído com sucesso');
      fetchStatus();
    } catch (error) {
      console.error('Erro ao excluir status:', error);
      toast.error('Erro ao excluir status');
    }
  };

  const reorderStatus = async (reorderedStatus: ReuniaoStatusType[]) => {
    try {
      const updates = reorderedStatus.map((s, index) => 
        supabase
          .from('reuniao_status')
          .update({ ordem: index })
          .eq('id', s.id)
      );

      await Promise.all(updates);
      toast.success('Ordem atualizada com sucesso');
      fetchStatus();
    } catch (error) {
      console.error('Erro ao reordenar status:', error);
      toast.error('Erro ao atualizar ordem');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    loading,
    fetchStatus,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatus
  };
};
