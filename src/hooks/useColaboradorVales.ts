import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ColaboradorVale } from '@/types/financeiro';
import { toast } from 'sonner';
import { useTenantId } from './useTenantId';

export const useColaboradorVales = (colaboradorId: string) => {
  const [vales, setVales] = useState<ColaboradorVale[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenantId();

  const fetchVales = useCallback(async () => {
    if (!colaboradorId || !tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('colaborador_vales')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('data', { ascending: false });

      if (error) throw error;
      setVales((data || []) as ColaboradorVale[]);
    } catch (error) {
      console.error('Erro ao carregar vales:', error);
    } finally {
      setLoading(false);
    }
  }, [colaboradorId, tenantId]);

  const createVale = async (vale: Omit<ColaboradorVale, 'id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('colaborador_vales')
        .insert({
          ...vale,
          colaborador_id: colaboradorId,
          user_id: user.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;
      
      setVales(prev => [data as ColaboradorVale, ...prev]);
      toast.success('Vale registrado com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao criar vale:', error);
      toast.error('Erro ao registrar vale');
      throw error;
    }
  };

  const updateVale = async (id: string, updates: Partial<ColaboradorVale>) => {
    try {
      const { data, error } = await supabase
        .from('colaborador_vales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setVales(prev => prev.map(v => v.id === id ? data as ColaboradorVale : v));
      toast.success('Vale atualizado');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar vale:', error);
      toast.error('Erro ao atualizar vale');
      throw error;
    }
  };

  const deleteVale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('colaborador_vales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setVales(prev => prev.filter(v => v.id !== id));
      toast.success('Vale removido');
    } catch (error) {
      console.error('Erro ao remover vale:', error);
      toast.error('Erro ao remover vale');
      throw error;
    }
  };

  return {
    vales,
    loading,
    fetchVales,
    createVale,
    updateVale,
    deleteVale
  };
};
