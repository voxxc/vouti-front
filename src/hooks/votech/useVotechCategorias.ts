import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import type { VotechCategoria } from '@/types/votech';

export function useVotechCategorias(tipo?: 'receita' | 'despesa') {
  const { user } = useVotechAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['votech-categorias', user?.id, tipo],
    queryFn: async () => {
      let q = supabase.from('votech_categorias').select('*').eq('user_id', user!.id).order('nome');
      if (tipo) q = q.eq('tipo', tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data as VotechCategoria[];
    },
    enabled: !!user,
  });

  const initCategorias = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('criar_votech_categorias_padrao', { p_user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['votech-categorias'] }),
  });

  return { ...query, initCategorias };
}
