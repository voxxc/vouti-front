import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Reuniao, ReuniaoFormData } from '@/types/reuniao';
import { toast } from 'sonner';

export const useReunioes = (selectedDate?: Date) => {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReunioes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é admin
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !!userRole;

      let query = supabase
        .from('reunioes')
        .select('*')
        .order('horario', { ascending: true });

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.eq('data', dateStr);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReunioes((data as Reuniao[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar reuniões:', error);
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  };

  const createReuniao = async (formData: ReuniaoFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let clienteId = formData.cliente_id;

      // Se não foi selecionado cliente mas tem nome, criar novo
      if (!clienteId && formData.cliente_nome) {
        const { data: novoCliente, error: clienteError } = await supabase
          .from('reuniao_clientes')
          .insert({
            user_id: user.id,
            created_by: user.id,
            nome: formData.cliente_nome,
            telefone: formData.cliente_telefone,
            email: formData.cliente_email,
            origem: 'reuniao'
          })
          .select()
          .single();

        if (clienteError) throw clienteError;
        clienteId = novoCliente.id;
      }

      const { data, error } = await supabase
        .from('reunioes')
        .insert([{
          ...formData,
          user_id: user.id,
          cliente_id: clienteId
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Reunião agendada com sucesso');
      await fetchReunioes();
      return data;
    } catch (error: any) {
      console.error('Erro ao criar reunião:', error);
      toast.error('Erro ao agendar reunião');
      throw error;
    }
  };

  const updateReuniao = async (id: string, updates: Partial<ReuniaoFormData>) => {
    try {
      const { error } = await supabase
        .from('reunioes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Reunião atualizada com sucesso');
      await fetchReunioes();
    } catch (error: any) {
      console.error('Erro ao atualizar reunião:', error);
      toast.error('Erro ao atualizar reunião');
      throw error;
    }
  };

  const deleteReuniao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reunioes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Reunião excluída com sucesso');
      await fetchReunioes();
    } catch (error: any) {
      console.error('Erro ao excluir reunião:', error);
      toast.error('Erro ao excluir reunião');
      throw error;
    }
  };

  useEffect(() => {
    fetchReunioes();
  }, [selectedDate]);

  return {
    reunioes,
    loading,
    fetchReunioes,
    createReuniao,
    updateReuniao,
    deleteReuniao
  };
};
