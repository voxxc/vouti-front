import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Send } from 'lucide-react';
import { useReuniaoClienteComentarios } from '@/hooks/useReuniaoClienteComentarios';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteComentariosTabProps {
  clienteId: string;
}

export const ClienteComentariosTab = ({ clienteId }: ClienteComentariosTabProps) => {
  const { comentarios, loading, addComentario, deleteComentario } = useReuniaoClienteComentarios(clienteId);
  const [novoComentario, setNovoComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const handleSubmit = async () => {
    if (!novoComentario.trim()) return;

    try {
      setSubmitting(true);
      await addComentario(novoComentario);
      setNovoComentario('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comentarioId: string) => {
    if (confirm('Deseja realmente excluir este comentário?')) {
      await deleteComentario(comentarioId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Lista de comentários */}
      <ScrollArea className="h-[400px] pr-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Carregando comentários...
          </p>
        ) : comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum comentário ainda
          </p>
        ) : (
          <div className="space-y-3">
            {comentarios.map((comentario) => (
              <div key={comentario.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comentario.profiles?.avatar_url} />
                  <AvatarFallback>
                    {comentario.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {comentario.profiles?.full_name || 'Usuário'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comentario.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                      {comentario.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(comentario.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comentario.comentario}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Formulário de novo comentário */}
      <div className="space-y-2 pt-4 border-t">
        <Textarea
          placeholder="Adicionar comentário sobre o cliente..."
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          className="min-h-24"
        />
        <Button
          onClick={handleSubmit}
          disabled={!novoComentario.trim() || submitting}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Enviando...' : 'Adicionar Comentário'}
        </Button>
      </div>
    </div>
  );
};
