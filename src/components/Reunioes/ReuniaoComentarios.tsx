import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Send } from 'lucide-react';
import { useReuniaoComentarios } from '@/hooks/useReuniaoComentarios';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReuniaoComentariosProps {
  reuniaoId: string;
}

export const ReuniaoComentarios = ({ reuniaoId }: ReuniaoComentariosProps) => {
  const { comentarios, loading, addComentario, deleteComentario } = useReuniaoComentarios(reuniaoId);
  const [novoComentario, setNovoComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  });

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
      <h3 className="font-semibold text-lg">Comentários</h3>

      {/* Lista de comentários */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários...</p>
        ) : comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comentário ainda</p>
        ) : (
          comentarios.map((comentario) => (
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
          ))
        )}
      </div>

      {/* Formulário de novo comentário */}
      <div className="space-y-2">
        <Textarea
          placeholder="Adicionar comentário..."
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          className="min-h-20"
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
