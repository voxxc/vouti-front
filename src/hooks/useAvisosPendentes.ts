import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AvisoPendente {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string;
  created_at: string;
}

export function useAvisosPendentes(userId: string | null, systemTypeId: string) {
  const queryClient = useQueryClient();

  const { data: avisosPendentes = [], isLoading } = useQuery({
    queryKey: ['avisos-pendentes', userId, systemTypeId],
    queryFn: async () => {
      if (!userId) return [];

      // Buscar avisos ativos do sistema
      const { data: avisos, error: avisosError } = await supabase
        .from('avisos_sistema')
        .select('*')
        .eq('system_type_id', systemTypeId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (avisosError) throw avisosError;

      if (!avisos || avisos.length === 0) return [];

      // Buscar ciências do usuário
      const { data: ciencias, error: cienciasError } = await supabase
        .from('avisos_ciencia')
        .select('aviso_id')
        .eq('user_id', userId);

      if (cienciasError) throw cienciasError;

      const cienciasIds = new Set(ciencias?.map(c => c.aviso_id) || []);

      // Filtrar avisos que o usuário ainda não deu ciência
      const pendentes = avisos.filter(aviso => !cienciasIds.has(aviso.id));

      return pendentes as AvisoPendente[];
    },
    enabled: !!userId && !!systemTypeId
  });

  const confirmarCiencia = useMutation({
    mutationFn: async (avisoId: string) => {
      if (!userId) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('avisos_ciencia')
        .insert({
          aviso_id: avisoId,
          user_id: userId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-pendentes'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao confirmar ciência', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  return {
    avisosPendentes,
    isLoading,
    confirmarCiencia
  };
}
