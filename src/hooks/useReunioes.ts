import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Reuniao, ReuniaoFormData } from '@/types/reuniao';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from './useTenantId';

export const useReunioes = (selectedDate?: Date) => {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { tenantId } = useTenantId();

  const fetchReunioes = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!user) return;

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

  // Resolve / cria o cliente vinculado a partir dos dados do form.
  // Prioridade: cliente_id > telefone existente > nome existente > criar novo.
  const resolveClienteId = async (formData: Partial<ReuniaoFormData>): Promise<string | undefined> => {
    if (!user) return undefined;

    if (formData.cliente_id) return formData.cliente_id;

    const nome = formData.cliente_nome?.trim();
    const telefoneRaw = formData.cliente_telefone?.trim();
    const email = formData.cliente_email?.trim();

    if (!nome && !telefoneRaw) return undefined;

    // Buscar por telefone (qualquer formato com mesmos dígitos)
    if (telefoneRaw) {
      const digits = telefoneRaw.replace(/\D/g, '');
      if (digits.length >= 8) {
        const { data: byPhone } = await supabase
          .from('reuniao_clientes')
          .select('id, nome, telefone, email')
          .eq('tenant_id', tenantId as string)
          .ilike('telefone', `%${digits.slice(-8)}%`)
          .limit(5);

        const match = (byPhone || []).find(
          c => (c.telefone || '').replace(/\D/g, '') === digits
        );
        if (match) return match.id;
      }
    }

    // Buscar por nome exato (case-insensitive)
    if (nome) {
      const { data: byName } = await supabase
        .from('reuniao_clientes')
        .select('id')
        .eq('tenant_id', tenantId as string)
        .ilike('nome', nome)
        .limit(1)
        .maybeSingle();
      if (byName?.id) return byName.id;
    }

    // Criar novo
    if (nome) {
      const { data: novoCliente, error } = await supabase
        .from('reuniao_clientes')
        .insert({
          user_id: user.id,
          created_by: user.id,
          tenant_id: tenantId,
          nome,
          telefone: telefoneRaw || null,
          email: email || null,
          origem: 'reuniao'
        })
        .select('id')
        .single();
      if (error) {
        console.error('Erro ao criar cliente vinculado:', error);
        return undefined;
      }
      return novoCliente.id;
    }

    return undefined;
  };

  const createReuniao = async (formData: ReuniaoFormData) => {
    try {
      if (!user) throw new Error('Usuario nao autenticado');

      const clienteId = await resolveClienteId(formData);

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
      // Re-resolver vínculo de cliente caso nome/telefone tenham mudado
      const touchesCliente =
        updates.cliente_id !== undefined ||
        updates.cliente_nome !== undefined ||
        updates.cliente_telefone !== undefined ||
        updates.cliente_email !== undefined;

      let payload: Partial<ReuniaoFormData> & { cliente_id?: string | null } = { ...updates };
      if (touchesCliente) {
        const resolved = await resolveClienteId(updates);
        if (resolved) payload.cliente_id = resolved;
      }

      const { error } = await supabase
        .from('reunioes')
        .update(payload)
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
  }, [selectedDate]);

  // Realtime subscription para atualizar quando reuniões mudam
  useEffect(() => {
    const channel = supabase
      .channel('reunioes-hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reunioes' },
        () => {
          fetchReunioes(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
