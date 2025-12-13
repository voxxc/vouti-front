import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Custo, CustoCategoria } from '@/types/financeiro';
import { toast } from 'sonner';
import { useTenantId } from './useTenantId';

export const useCustos = () => {
  const [custos, setCustos] = useState<Custo[]>([]);
  const [categorias, setCategorias] = useState<CustoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenantId();

  const fetchCategorias = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('custo_categorias')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome');

      if (error) throw error;
      
      // Se nao tem categorias, criar as padrao
      if (!data || data.length === 0) {
        await supabase.rpc('criar_categorias_custos_padrao', { p_tenant_id: tenantId });
        const { data: newData } = await supabase
          .from('custo_categorias')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('nome');
        setCategorias((newData || []) as CustoCategoria[]);
      } else {
        setCategorias(data as CustoCategoria[]);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, [tenantId]);

  const fetchCustos = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('custos')
        .select(`
          *,
          categoria:custo_categorias(*)
        `)
        .eq('tenant_id', tenantId)
        .order('data', { ascending: false });

      if (error) throw error;
      setCustos((data || []) as Custo[]);
    } catch (error) {
      console.error('Erro ao carregar custos:', error);
      toast.error('Erro ao carregar custos');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCategorias();
    fetchCustos();
  }, [fetchCategorias, fetchCustos]);

  const createCusto = async (custo: Omit<Custo, 'id' | 'created_at' | 'updated_at' | 'categoria'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('custos')
        .insert({
          ...custo,
          user_id: user.id,
          tenant_id: tenantId
        })
        .select(`*, categoria:custo_categorias(*)`)
        .single();

      if (error) throw error;
      
      setCustos(prev => [data as Custo, ...prev]);
      toast.success('Custo cadastrado com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao criar custo:', error);
      toast.error('Erro ao cadastrar custo');
      throw error;
    }
  };

  const updateCusto = async (id: string, updates: Partial<Custo>) => {
    try {
      const { categoria, ...updateData } = updates;
      
      const { data, error } = await supabase
        .from('custos')
        .update(updateData)
        .eq('id', id)
        .select(`*, categoria:custo_categorias(*)`)
        .single();

      if (error) throw error;
      
      setCustos(prev => prev.map(c => c.id === id ? data as Custo : c));
      toast.success('Custo atualizado');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar custo:', error);
      toast.error('Erro ao atualizar custo');
      throw error;
    }
  };

  const deleteCusto = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCustos(prev => prev.filter(c => c.id !== id));
      toast.success('Custo removido');
    } catch (error) {
      console.error('Erro ao remover custo:', error);
      toast.error('Erro ao remover custo');
      throw error;
    }
  };

  const createCategoria = async (nome: string, cor: string = '#6366f1') => {
    try {
      const { data, error } = await supabase
        .from('custo_categorias')
        .insert({ nome, cor, tenant_id: tenantId, padrao: false })
        .select()
        .single();

      if (error) throw error;
      
      setCategorias(prev => [...prev, data as CustoCategoria]);
      toast.success('Categoria criada');
      return data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
      throw error;
    }
  };

  const deleteCategoria = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custo_categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCategorias(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria removida');
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast.error('Erro ao remover categoria');
      throw error;
    }
  };

  return {
    custos,
    categorias,
    loading,
    fetchCustos,
    createCusto,
    updateCusto,
    deleteCusto,
    createCategoria,
    deleteCategoria
  };
};
