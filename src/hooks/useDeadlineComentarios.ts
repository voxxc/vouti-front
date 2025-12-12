import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';

interface DeadlineComentario {
  id: string;
  deadline_id: string;
  user_id: string;
  comentario: string;
  created_at: string;
  autor?: {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const useDeadlineComentarios = (deadlineId: string | null) => {
  const [comentarios, setComentarios] = useState<DeadlineComentario[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenantId();

  const fetchComentarios = async () => {
    if (!deadlineId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deadline_comentarios')
        .select('*')
        .eq('deadline_id', deadlineId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Buscar profiles separadamente para cada comentario
      const comentariosWithProfiles = await Promise.all(
        (data || []).map(async (comentario) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url')
            .eq('user_id', comentario.user_id)
            .single();
          
          return {
            ...comentario,
            autor: profile || undefined
          };
        })
      );
      
      setComentarios(comentariosWithProfiles);
    } catch (error) {
      console.error('Erro ao carregar comentarios:', error);
      toast({
        title: "Erro",
        description: "Nao foi possivel carregar os comentarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComentario = async (comentario: string): Promise<boolean> => {
    if (!deadlineId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('deadline_comentarios')
        .insert({
          deadline_id: deadlineId,
          user_id: user.id,
          comentario: comentario.trim(),
          tenant_id: tenantId
        });

      if (error) throw error;

      await fetchComentarios();
      
      toast({
        title: "✓ Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteComentario = async (comentarioId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('deadline_comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;

      await fetchComentarios();
      
      toast({
        title: "✓ Comentário removido",
        description: "O comentário foi removido com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o comentário.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, [deadlineId]);

  // Real-time subscription para atualizacoes automaticas
  useEffect(() => {
    if (!deadlineId) return;

    const channel = supabase
      .channel(`deadline-comentarios-${deadlineId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deadline_comentarios',
          filter: `deadline_id=eq.${deadlineId}`
        },
        () => {
          fetchComentarios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deadlineId]);

  return {
    comentarios,
    loading,
    addComentario,
    deleteComentario,
    fetchComentarios,
  };
};
