import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import type { VotechTransacao } from '@/types/votech';

interface Filters {
  tipo: 'receita' | 'despesa';
  periodo?: { inicio: string; fim: string };
  categoriaId?: string;
  status?: string;
}

export function useVotechTransacoes(filters: Filters) {
  const { user } = useVotechAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['votech-transacoes', user?.id, filters],
    queryFn: async () => {
      let q = supabase
        .from('votech_transacoes')
        .select('*, categoria:votech_categorias(*)')
        .eq('user_id', user!.id)
        .eq('tipo', filters.tipo)
        .order('data', { ascending: false });

      if (filters.periodo) {
        q = q.gte('data', filters.periodo.inicio).lte('data', filters.periodo.fim);
      }
      if (filters.categoriaId) q = q.eq('categoria_id', filters.categoriaId);
      if (filters.status) q = q.eq('status', filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return data as VotechTransacao[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (t: Omit<VotechTransacao, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categoria'>) => {
      const { error } = await supabase.from('votech_transacoes').insert({ ...t, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-transacoes'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...t }: Partial<VotechTransacao> & { id: string }) => {
      const { error } = await supabase.from('votech_transacoes').update(t).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-transacoes'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('votech_transacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-transacoes'] }),
  });

  return { ...query, create, update, remove };
}
