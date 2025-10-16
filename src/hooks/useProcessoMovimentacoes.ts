import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MovimentacaoComConferencia } from '@/types/movimentacao';

export const useProcessoMovimentacoes = (processoId?: string) => {
  const { toast } = useToast();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoComConferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [conferidos, setConferidos] = useState(0);

  const fetchMovimentacoes = async () => {
    if (!processoId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('processo_movimentacoes')
        .select(`
          *,
          processo_movimentacao_conferencia (
            *
          )
        `)
        .eq('processo_id', processoId)
        .order('data_movimentacao', { ascending: false });

      if (error) throw error;

      // Buscar dados dos usuários separadamente se necessário
      const movimentacoesComUsuarios = await Promise.all((data || []).map(async (mov) => {
        const conferencias = Array.isArray(mov.processo_movimentacao_conferencia) 
          ? mov.processo_movimentacao_conferencia 
          : [];
          
        if (conferencias[0]?.conferido_por) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', conferencias[0].conferido_por)
            .single();
          
          return {
            ...mov,
            processo_movimentacao_conferencia: conferencias.map(conf => ({
              ...conf,
              usuario: profileData
            }))
          };
        }
        return mov;
      }));

      const movimentacoesFormatadas: MovimentacaoComConferencia[] = movimentacoesComUsuarios.map(mov => ({
        ...mov,
        conferencia: Array.isArray(mov.processo_movimentacao_conferencia) && mov.processo_movimentacao_conferencia.length > 0
          ? mov.processo_movimentacao_conferencia[0]
          : undefined
      }));

      setMovimentacoes(movimentacoesFormatadas);
      
      const pendentesCount = movimentacoesFormatadas.filter(m => m.status_conferencia === 'pendente').length;
      const conferidosCount = movimentacoesFormatadas.filter(m => m.status_conferencia === 'conferido').length;
      
      setPendentes(pendentesCount);
      setConferidos(conferidosCount);
    } catch (error: any) {
      console.error('Erro ao buscar movimentações:', error);
      toast({
        title: 'Erro ao carregar movimentações',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarConferido = async (movimentacaoId: string, observacoes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Inserir ou atualizar conferência
      const { error: confError } = await supabase
        .from('processo_movimentacao_conferencia')
        .upsert({
          movimentacao_id: movimentacaoId,
          conferido: true,
          conferido_por: user.id,
          conferido_em: new Date().toISOString(),
          observacoes_conferencia: observacoes || null
        }, { onConflict: 'movimentacao_id' });

      if (confError) throw confError;

      // Atualizar status na movimentação
      const { error: statusError } = await supabase
        .from('processo_movimentacoes')
        .update({ status_conferencia: 'conferido' })
        .eq('id', movimentacaoId);

      if (statusError) throw statusError;

      toast({
        title: 'Andamento conferido',
        description: 'O andamento foi marcado como conferido com sucesso',
      });

      await fetchMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao marcar como conferido:', error);
      toast({
        title: 'Erro ao conferir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const marcarEmRevisao = async (movimentacaoId: string) => {
    try {
      const { error } = await supabase
        .from('processo_movimentacoes')
        .update({ status_conferencia: 'em_revisao' })
        .eq('id', movimentacaoId);

      if (error) throw error;

      toast({
        title: 'Andamento em revisão',
        description: 'O andamento foi marcado para revisão',
      });

      await fetchMovimentacoes();
    } catch (error: any) {
      console.error('Erro ao marcar em revisão:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchMovimentacoes();

    // Configurar realtime para atualizações
    if (processoId) {
      const channel = supabase
        .channel(`movimentacoes-${processoId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'processo_movimentacoes',
            filter: `processo_id=eq.${processoId}`
          },
          () => {
            fetchMovimentacoes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [processoId]);

  return {
    movimentacoes,
    loading,
    pendentes,
    conferidos,
    marcarConferido,
    marcarEmRevisao,
    refetch: fetchMovimentacoes
  };
};
