import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ColaboradorComentario } from '@/types/financeiro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';

interface ColaboradorComentariosTabProps {
  colaboradorId: string;
}

export const ColaboradorComentariosTab = ({ colaboradorId }: ColaboradorComentariosTabProps) => {
  const [comentarios, setComentarios] = useState<ColaboradorComentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoComentario, setNovoComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { tenantId } = useTenantId();

  const fetchComentarios = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('colaborador_comentarios')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch authors
      const comentariosComAutor = await Promise.all(
        (data || []).map(async (comentario: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', comentario.user_id)
            .single();

          return {
            ...comentario,
            autor: profile || undefined
          } as ColaboradorComentario;
        })
      );

      setComentarios(comentariosComAutor);
    } catch (error) {
      console.error('Erro ao carregar comentarios:', error);
    } finally {
      setLoading(false);
    }
  }, [colaboradorId]);

  useEffect(() => {
    fetchComentarios();
    
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, [fetchComentarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { error } = await supabase
        .from('colaborador_comentarios')
        .insert({
          colaborador_id: colaboradorId,
          user_id: user.id,
          comentario: novoComentario.trim(),
          tenant_id: tenantId
        });

      if (error) throw error;

      setNovoComentario('');
      fetchComentarios();
      toast.success('Comentario adicionado');
    } catch (error) {
      console.error('Erro ao adicionar comentario:', error);
      toast.error('Erro ao adicionar comentario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('colaborador_comentarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setComentarios(prev => prev.filter(c => c.id !== id));
      toast.success('Comentario removido');
    } catch (error) {
      console.error('Erro ao remover comentario:', error);
      toast.error('Erro ao remover comentario');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          placeholder="Adicionar comentario..."
          rows={2}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={saving || !novoComentario.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
        </Button>
      </form>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </CardContent>
        </Card>
      ) : comentarios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum comentario registrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comentarios.map((comentario) => (
            <Card key={comentario.id}>
              <CardContent className="py-3">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comentario.autor?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comentario.autor?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comentario.autor?.full_name || 'Usuario'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comentario.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {comentario.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(comentario.id)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comentario.comentario}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
