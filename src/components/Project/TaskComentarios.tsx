import { useState } from 'react';
import { useTaskComentarios } from '@/hooks/useTaskComentarios';
import { CommentType } from '@/hooks/useCommentMentions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Trash2, Send, Reply, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TenantMentionInput } from '@/components/Common/TenantMentionInput';
import { CommentText } from '@/components/Common/CommentText';

interface TaskComentariosProps {
  taskId: string | null;
  currentUserId: string;
  commentType?: CommentType;
  contextTitle?: string;
  relatedProjectId?: string;
}

export const TaskComentarios = ({ taskId, currentUserId, commentType, contextTitle, relatedProjectId }: TaskComentariosProps) => {
  const { comentarios, loading, addComentario, deleteComentario } = useTaskComentarios(taskId, { commentType, contextTitle, relatedProjectId });
  const [novoComentario, setNovoComentario] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; autorName: string; text: string } | null>(null);

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;

    setSubmitting(true);
    const success = await addComentario(novoComentario, mentionedUserIds, replyingTo?.id || null);
    if (success) {
      setNovoComentario('');
      setMentionedUserIds([]);
      setReplyingTo(null);
    }
    setSubmitting(false);
  };

  if (!taskId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        <h3 className="font-semibold text-sm">Comentários do Processo</h3>
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border text-xs">
          <Reply className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{replyingTo.autorName}:</span>{' '}
            <span className="text-muted-foreground truncate">{replyingTo.text.slice(0, 60)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyingTo(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <TenantMentionInput
          value={novoComentario}
          onChange={setNovoComentario}
          onMentionsChange={setMentionedUserIds}
          placeholder="Comentar... Use @ para mencionar"
          rows={2}
          disabled={submitting}
        />
        <Button
          onClick={handleAddComentario}
          disabled={!novoComentario.trim() || submitting}
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>

      <ScrollArea className="h-[250px] pr-4">
        <div className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário ainda
            </p>
          ) : (
            comentarios.map((comentario) => (
              <div
                key={comentario.id}
                className="p-3 rounded-lg border bg-card space-y-1.5"
              >
                {/* Reply reference */}
                {comentario.reply_to && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded">
                    <Reply className="w-3 h-3 shrink-0" />
                    <span className="font-medium">{comentario.reply_to.autor_name}:</span>
                    <span className="truncate">{comentario.reply_to.comment_text.slice(0, 50)}</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={comentario.autor?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {comentario.autor?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {comentario.autor?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comentario.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setReplyingTo({
                        id: comentario.id,
                        autorName: comentario.autor?.full_name || 'Usuário',
                        text: comentario.comment_text,
                      })}
                    >
                      <Reply className="w-3 h-3" />
                    </Button>
                    {comentario.user_id === currentUserId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar comentário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteComentario(comentario.id)}>
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <CommentText text={comentario.comment_text} />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
