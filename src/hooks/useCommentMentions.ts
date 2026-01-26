import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export type CommentType = 'deadline' | 'reuniao' | 'reuniao_cliente' | 'parcela' | 'task';

interface SaveMentionsParams {
  commentType: CommentType;
  commentId: string;
  mentionedUserIds: string[];
  contextTitle?: string;
}

export const useCommentMentions = () => {
  const { tenantId } = useTenantId();

  const saveMentions = async ({
    commentType,
    commentId,
    mentionedUserIds,
    contextTitle,
  }: SaveMentionsParams): Promise<boolean> => {
    if (!mentionedUserIds.length || !tenantId) return true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const authorName = authorProfile?.full_name || 'Alguém';

      // Inserir menções usando type casting
      const mentionInserts = mentionedUserIds.map(userId => ({
        comment_type: commentType,
        comment_id: commentId,
        mentioned_user_id: userId,
        mentioned_by_user_id: user.id,
        tenant_id: tenantId,
      }));

      const { error: mentionError } = await supabase
        .from('comment_mentions' as any)
        .insert(mentionInserts as any);

      if (mentionError) {
        console.error('Erro ao salvar menções:', mentionError);
      }

      // Criar notificações
      const typeLabels: Record<CommentType, string> = {
        deadline: 'um prazo',
        reuniao: 'uma reunião',
        reuniao_cliente: 'um cliente de reunião',
        parcela: 'uma parcela',
        task: 'uma tarefa',
      };

      const notificationInserts = mentionedUserIds
        .filter(userId => userId !== user.id)
        .map(userId => ({
          user_id: userId,
          triggered_by_user_id: user.id,
          type: 'comment_mention',
          title: 'Você foi mencionado',
          content: contextTitle
            ? `${authorName} mencionou você em um comentário sobre ${contextTitle}.`
            : `${authorName} mencionou você em um comentário de ${typeLabels[commentType]}.`,
          tenant_id: tenantId,
        }));

      if (notificationInserts.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationInserts);

        if (notifError) {
          console.error('Erro ao enviar notificações:', notifError);
        }
      }

      return true;
    } catch (error) {
      console.error('Erro em saveMentions:', error);
      return false;
    }
  };

  const deleteMentions = async (commentType: CommentType, commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('comment_mentions' as any)
        .delete()
        .eq('comment_type', commentType)
        .eq('comment_id', commentId);

      if (error) {
        console.error('Erro ao deletar menções:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro em deleteMentions:', error);
      return false;
    }
  };

  return { saveMentions, deleteMentions };
};
