import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoClienteComentario } from '@/types/reuniao';
import { toast } from 'sonner';

export const useReuniaoClienteComentarios = (clienteId: string) => {
  const [comentarios, setComentarios] = useState<ReuniaoClienteComentario[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComentarios = async () => {
    if (!clienteId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reuniao_cliente_comentarios')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch profiles separately
      const comentariosWithProfiles = await Promise.all(
        (data || []).map(async (comentario) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', comentario.user_id)
            .single();
          
          return {
            ...comentario,
            profiles: profile
          };
        })
      );
      
      setComentarios(comentariosWithProfiles);
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error);
      toast.error('Erro ao carregar comentários do cliente');
    } finally {
      setLoading(false);
    }
  };

  const addComentario = async (comentario: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reuniao_cliente_comentarios')
        .insert([{
          cliente_id: clienteId,
          user_id: user.id,
          comentario
        }]);

      if (error) throw error;

      toast.success('Comentário adicionado');
      await fetchComentarios();
    } catch (error: any) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
      throw error;
    }
  };

  const deleteComentario = async (comentarioId: string) => {
    try {
      const { error } = await supabase
        .from('reuniao_cliente_comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;

      toast.success('Comentário removido');
      await fetchComentarios();
    } catch (error: any) {
      console.error('Erro ao remover comentário:', error);
      toast.error('Erro ao remover comentário');
      throw error;
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, [clienteId]);

  return {
    comentarios,
    loading,
    addComentario,
    deleteComentario,
    refetch: fetchComentarios
  };
};
