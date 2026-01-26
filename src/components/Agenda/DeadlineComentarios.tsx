import { useState } from 'react';
import { useDeadlineComentarios } from '@/hooks/useDeadlineComentarios';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Trash2, Send } from 'lucide-react';
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

interface DeadlineComentariosProps {
  deadlineId: string | null;
  currentUserId: string;
  deadlineTitle?: string;
}

export const DeadlineComentarios = ({ 
  deadlineId, 
  currentUserId,
  deadlineTitle 
}: DeadlineComentariosProps) => {
  const { comentarios, loading, addComentario, deleteComentario } = useDeadlineComentarios(deadlineId);
  const [novoComentario, setNovoComentario] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;

    setSubmitting(true);
    const success = await addComentario(
      novoComentario,
      mentionedUserIds,
      deadlineTitle ? `prazo "${deadlineTitle}"` : undefined
    );
    if (success) {
      setNovoComentario('');
      setMentionedUserIds([]);
    }
    setSubmitting(false);
  };

  const handleDeleteComentario = async (comentarioId: string) => {
    await deleteComentario(comentarioId);
  };

  if (!deadlineId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-semibold">Comentários</h3>
      </div>

      <div className="space-y-2">
        <TenantMentionInput
          value={novoComentario}
          onChange={setNovoComentario}
          onMentionsChange={setMentionedUserIds}
          placeholder="Adicionar comentário... Use @ para mencionar"
          rows={3}
          disabled={submitting}
        />
        <Button
          onClick={handleAddComentario}
          disabled={!novoComentario.trim() || submitting}
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Adicionando...' : 'Adicionar Comentário'}
        </Button>
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário ainda
            </p>
          ) : (
            comentarios.map((comentario) => (
              <div
                key={comentario.id}
                className="p-3 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comentario.autor?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {comentario.autor?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {comentario.autor?.full_name || comentario.autor?.email || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comentario.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  {comentario.user_id === currentUserId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4" />
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
                          <AlertDialogAction
                            onClick={() => handleDeleteComentario(comentario.id)}
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CommentText text={comentario.comentario} />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
