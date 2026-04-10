import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import type { VotechConta } from '@/types/votech';

interface Filters {
  tipo: 'pagar' | 'receber';
  status?: string;
  periodo?: { inicio: string; fim: string };
}

export function useVotechContas(filters: Filters) {
  const { user } = useVotechAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['votech-contas', user?.id, filters],
    queryFn: async () => {
      let q = supabase
        .from('votech_contas')
        .select('*, categoria:votech_categorias(*)')
        .eq('user_id', user!.id)
        .eq('tipo', filters.tipo)
        .order('data_vencimento', { ascending: true });

      if (filters.status) q = q.eq('status', filters.status);
      if (filters.periodo) {
        q = q.gte('data_vencimento', filters.periodo.inicio).lte('data_vencimento', filters.periodo.fim);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as VotechConta[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (c: Omit<VotechConta, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categoria'>) => {
      const { error } = await supabase.from('votech_contas').insert({ ...c, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-contas'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...c }: Partial<VotechConta> & { id: string }) => {
      const { error } = await supabase.from('votech_contas').update(c).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-contas'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('votech_contas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-contas'] }),
  });

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('votech_contas').update({
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-contas'] }),
  });

  return { ...query, create, update, remove, marcarPago };
}
