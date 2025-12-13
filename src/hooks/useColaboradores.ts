import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Colaborador } from '@/types/financeiro';
import { toast } from 'sonner';
import { useTenantId } from './useTenantId';

export const useColaboradores = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenantId();

  const fetchColaboradores = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome_completo');

      if (error) throw error;
      setColaboradores((data || []) as Colaborador[]);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  const createColaborador = async (colaborador: Omit<Colaborador, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('colaboradores')
        .insert({
          ...colaborador,
          user_id: user.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;
      
      setColaboradores(prev => [...prev, data as Colaborador]);
      toast.success('Colaborador cadastrado com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao criar colaborador:', error);
      toast.error('Erro ao cadastrar colaborador');
      throw error;
    }
  };

  const updateColaborador = async (id: string, updates: Partial<Colaborador>) => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setColaboradores(prev => prev.map(c => c.id === id ? data as Colaborador : c));
      toast.success('Colaborador atualizado');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error);
      toast.error('Erro ao atualizar colaborador');
      throw error;
    }
  };

  const deleteColaborador = async (id: string) => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setColaboradores(prev => prev.filter(c => c.id !== id));
      toast.success('Colaborador removido');
    } catch (error) {
      console.error('Erro ao remover colaborador:', error);
      toast.error('Erro ao remover colaborador');
      throw error;
    }
  };

  return {
    colaboradores,
    loading,
    fetchColaboradores,
    createColaborador,
    updateColaborador,
    deleteColaborador
  };
};
