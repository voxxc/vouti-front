import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoCliente, ReuniaoClienteFormData } from '@/types/reuniao';
import { toast } from 'sonner';

export const useReuniaoClientes = () => {
  const [clientes, setClientes] = useState<ReuniaoCliente[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é admin ou agenda
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isAdminOrAgenda = roles?.some(r => 
        r.role === 'admin' || r.role === 'agenda'
      );

      // Construir query com filtro condicional
      let query = supabase
        .from('reuniao_clientes')
        .select('*');
      
      // Se não for admin/agenda, filtrar por user_id
      if (!isAdminOrAgenda) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('nome', { ascending: true });

      if (error) throw error;

      // Buscar contagem de reuniões e informações do criador para cada cliente
      const clientesComStats = await Promise.all((data || []).map(async (cliente) => {
        const { count } = await supabase
          .from('reunioes')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', cliente.id);

        const { data: ultimaReuniao } = await supabase
          .from('reunioes')
          .select('data')
          .eq('cliente_id', cliente.id)
          .order('data', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar informações do criador
        let creatorName = 'Desconhecido';
        let creatorEmail = '';
        
        if (cliente.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', cliente.created_by)
            .maybeSingle();
          
          if (profile) {
            creatorName = profile.full_name || 'Desconhecido';
            creatorEmail = profile.email || '';
          }
        }

        return {
          ...cliente,
          creator_name: creatorName,
          creator_email: creatorEmail,
          total_reunioes: count || 0,
          ultima_reuniao: ultimaReuniao?.data || null
        };
      }));

      setClientes(clientesComStats);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes de reunião');
    } finally {
      setLoading(false);
    }
  };

  const buscarCliente = async (termo: string): Promise<ReuniaoCliente[]> => {
    try {
      const { data, error } = await supabase
        .from('reuniao_clientes')
        .select('*')
        .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao buscar cliente');
      return [];
    }
  };

  const criarCliente = async (formData: ReuniaoClienteFormData): Promise<ReuniaoCliente | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('reuniao_clientes')
        .insert([{
          ...formData,
          user_id: user.id,
          created_by: user.id,
          origem: 'manual'
        }])
        .select()
        .single();

      if (error) throw error;

      
      await fetchClientes();
      return data;
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao cadastrar cliente');
      return null;
    }
  };

  const atualizarCliente = async (id: string, updates: Partial<ReuniaoClienteFormData>) => {
    try {
      const { error } = await supabase
        .from('reuniao_clientes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      
      await fetchClientes();
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const obterHistoricoReunioesCliente = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('reunioes')
        .select(`
          *,
          reuniao_comentarios(*)
        `)
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de reuniões');
      return [];
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return {
    clientes,
    loading,
    fetchClientes,
    buscarCliente,
    criarCliente,
    atualizarCliente,
    obterHistoricoReunioesCliente
  };
};
