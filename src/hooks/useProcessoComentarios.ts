import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { useCommentMentions } from '@/hooks/useCommentMentions';

interface ProcessoComentario {
  id: string;
  processo_id: string;
  user_id: string;
  comment_text: string;
  reply_to_id: string | null;
  mentioned_user_ids: string[];
  created_at: string;
  autor?: {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  reply_to?: {
    comment_text: string;
    autor_name: string;
  };
}

export const useProcessoComentarios = (processoId: string | null) => {
  const [comentarios, setComentarios] = useState<ProcessoComentario[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const { saveMentions, deleteMentions } = useCommentMentions();

  const fetchComentarios = async () => {
    if (!processoId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processo_comentarios')
        .select('*')
        .eq('processo_id', processoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const comentariosWithProfiles = await Promise.all(
        (data || []).map(async (comentario: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url')
            .eq('user_id', comentario.user_id)
            .single();
          
          let replyTo = undefined;
          if (comentario.reply_to_id) {
            const parentComment = (data || []).find((c: any) => c.id === comentario.reply_to_id);
            if (parentComment) {
              const { data: parentProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', parentComment.user_id)
                .single();
              replyTo = {
                comment_text: parentComment.comment_text,
                autor_name: parentProfile?.full_name || 'Usuário',
              };
            }
          }
          
          return {
            ...comentario,
            autor: profile || undefined,
            reply_to: replyTo,
          };
        })
      );
      
      setComentarios(comentariosWithProfiles);
    } catch (error) {
      console.error('Erro ao carregar comentarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComentario = async (
    commentText: string,
    mentionedUserIds?: string[],
    replyToId?: string | null
  ): Promise<boolean> => {
    if (!processoId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: insertedComment, error } = await supabase
        .from('processo_comentarios')
        .insert({
          processo_id: processoId,
          user_id: user.id,
          comment_text: commentText.trim(),
          reply_to_id: replyToId || null,
          mentioned_user_ids: mentionedUserIds || [],
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;

      if (mentionedUserIds?.length && insertedComment) {
        await saveMentions({
          commentType: 'processo',
          commentId: insertedComment.id,
          mentionedUserIds,
          relatedEntityId: processoId,
        });
      }

      await fetchComentarios();
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
      await deleteMentions('processo', comentarioId);

      const { error } = await supabase
        .from('processo_comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;
      await fetchComentarios();
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
  }, [processoId]);

  useEffect(() => {
    if (!processoId) return;

    const channel = supabase
      .channel(`processo-comentarios-${processoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processo_comentarios',
          filter: `processo_id=eq.${processoId}`
        },
        () => {
          fetchComentarios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processoId]);

  return {
    comentarios,
    loading,
    addComentario,
    deleteComentario,
  };
};
