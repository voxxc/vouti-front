import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Reuniao, ReuniaoFormData } from '@/types/reuniao';
import { toast } from 'sonner';
import { getTenantIdForUser } from './useTenantId';

export const useReunioes = (selectedDate?: Date) => {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReunioes = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // RLS now handles tenant filtering automatically
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !!userRole;

      let query = supabase
        .from('reunioes')
        .select('*, creator:profiles!reunioes_user_id_fkey(full_name)')
        .eq('situacao_agenda', 'ativa')
        .order('horario', { ascending: true });

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.eq('data', dateStr);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        criado_por_nome: item.creator?.full_name || undefined,
        creator: undefined,
      })) as Reuniao[];
      setReunioes(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar reunioes:', error);
      toast.error('Erro ao carregar reunioes');
    } finally {
      setLoading(false);
    }
  };

  const createReuniao = async (formData: ReuniaoFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Get tenant_id for the user
      const tenantId = await getTenantIdForUser(user.id);

      let clienteId = formData.cliente_id;

      // Se nao foi selecionado cliente mas tem nome, criar novo
      if (!clienteId && formData.cliente_nome) {
        const { data: novoCliente, error: clienteError } = await supabase
          .from('reuniao_clientes')
          .insert({
            user_id: user.id,
            created_by: user.id,
            tenant_id: tenantId,
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
          tenant_id: tenantId,
          cliente_id: clienteId
        }])
        .select()
        .single();

      if (error) throw error;

      
      await fetchReunioes();
      return data;
    } catch (error: any) {
      console.error('Erro ao criar reuniao:', error);
      toast.error('Erro ao agendar reuniao');
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

      
      await fetchReunioes();
    } catch (error: any) {
      console.error('Erro ao excluir reunião:', error);
      toast.error('Erro ao excluir reunião');
      throw error;
    }
  };

  const alterarSituacaoReuniao = async (
    id: string, 
    situacao: 'desmarcada' | 'remarcada', 
    motivo?: string,
    novaData?: string,
    novoHorario?: string
  ) => {
    try {
      if (situacao === 'remarcada' && novaData && novoHorario) {
        // Remarcar: atualiza data/horario e mantém ativa
        const { error } = await supabase
          .from('reunioes')
          .update({
            data: novaData,
            horario: novoHorario,
            motivo_alteracao: motivo || null,
            data_alteracao_situacao: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        toast.success('Reunião remarcada com sucesso');
      } else {
        // Desmarcar ou fallback
        const { error } = await supabase
          .from('reunioes')
          .update({
            situacao_agenda: situacao,
            data_alteracao_situacao: new Date().toISOString(),
            motivo_alteracao: motivo || null
          })
          .eq('id', id);
        if (error) throw error;
        toast.success(`Reunião ${situacao === 'desmarcada' ? 'desmarcada' : 'remarcada'} com sucesso`);
      }

      await fetchReunioes();
    } catch (error: any) {
      console.error('Erro ao alterar situação da reunião:', error);
      toast.error('Erro ao alterar situação da reunião');
      throw error;
    }
  };

  useEffect(() => {
    fetchReunioes();
    const intervalId = setInterval(() => {
      fetchReunioes(true);
    }, 4000);
    return () => clearInterval(intervalId);
  }, [selectedDate]);

  return {
    reunioes,
    loading,
    fetchReunioes,
    createReuniao,
    updateReuniao,
    deleteReuniao,
    alterarSituacaoReuniao
  };
};
