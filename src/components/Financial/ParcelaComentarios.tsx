import { useState } from 'react';
import { useParcelaComentarios } from '@/hooks/useClienteParcelas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ParcelaComentariosProps {
  parcelaId: string | null;
  currentUserId: string;
}

export const ParcelaComentarios = ({ parcelaId, currentUserId }: ParcelaComentariosProps) => {
  const { comentarios, loading, addComentario, deleteComentario } = useParcelaComentarios(parcelaId);
  const [novoComentario, setNovoComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;

    setSubmitting(true);
    const success = await addComentario(novoComentario);
    if (success) {
      setNovoComentario('');
    }
    setSubmitting(false);
  };

  const handleDeleteComentario = async (comentarioId: string) => {
    await deleteComentario(comentarioId);
  };

  if (!parcelaId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-semibold">Comentários</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Adicionar comentário sobre esta parcela..."
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          rows={3}
        />
        <Button
          onClick={handleAddComentario}
          disabled={!novoComentario.trim() || submitting}
          size="sm"
        >
          {submitting ? 'Adicionando...' : 'Adicionar Comentário'}
        </Button>
      </div>

      <ScrollArea className="h-[200px] pr-4">
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
                <p className="text-sm whitespace-pre-wrap break-words">
                  {comentario.comentario}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
