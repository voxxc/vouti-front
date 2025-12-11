import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoComentario } from '@/types/reuniao';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';

export const useReuniaoComentarios = (reuniaoId: string) => {
  const { tenantId } = useTenantId();
  const [comentarios, setComentarios] = useState<ReuniaoComentario[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComentarios = async () => {
    if (!reuniaoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reuniao_comentarios')
        .select('*')
        .eq('reuniao_id', reuniaoId)
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
      toast.error('Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  };

  const addComentario = async (comentario: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reuniao_comentarios')
        .insert([{
          reuniao_id: reuniaoId,
          user_id: user.id,
          comentario,
          tenant_id: tenantId
        }]);

      if (error) throw error;

      
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
        .from('reuniao_comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;

      
      await fetchComentarios();
    } catch (error: any) {
      console.error('Erro ao remover comentário:', error);
      toast.error('Erro ao remover comentário');
      throw error;
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, [reuniaoId]);

  return {
    comentarios,
    loading,
    addComentario,
    deleteComentario,
    refetch: fetchComentarios
  };
};
