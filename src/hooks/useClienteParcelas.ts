import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClienteParcela, ParcelaComentario, DadosBaixaPagamento } from '@/types/financeiro';
import { toast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { useCommentMentions } from '@/hooks/useCommentMentions';

export const useClienteParcelas = (clienteId: string | null, dividaId?: string | null) => {
  const { tenantId } = useTenantId();
  const [parcelas, setParcelas] = useState<ClienteParcela[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchParcelas = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('cliente_parcelas')
        .select('*')
        .eq('cliente_id', clienteId);

      // Filtrar por divida_id se fornecido
      if (dividaId !== undefined) {
        if (dividaId === null) {
          // Buscar apenas parcelas do contrato original (sem divida_id)
          query = query.is('divida_id', null);
        } else {
          // Buscar apenas parcelas da dívida específica
          query = query.eq('divida_id', dividaId);
        }
      }

      const { data, error } = await query.order('numero_parcela', { ascending: true });

      if (error) throw error;
      setParcelas(data as ClienteParcela[] || []);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      toast({
        title: 'Erro ao carregar parcelas',
        description: 'Não foi possível carregar as parcelas do cliente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcelas();
  }, [clienteId, dividaId]);

  const darBaixaParcela = async (parcelaId: string, dados: DadosBaixaPagamento) => {
    try {
      let comprovanteUrl = null;

      // Upload de comprovante se fornecido
      if (dados.comprovante) {
        const fileExt = dados.comprovante.name.split('.').pop();
        const fileName = `${parcelaId}_${Date.now()}.${fileExt}`;
        const filePath = `${clienteId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comprovantes-pagamento')
          .upload(filePath, dados.comprovante);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('comprovantes-pagamento')
          .getPublicUrl(filePath);

        comprovanteUrl = publicUrl;
      }

      // Atualizar parcela
      const { error: updateError } = await supabase
        .from('cliente_parcelas')
        .update({
          status: 'pago',
          data_pagamento: dados.data_pagamento,
          metodo_pagamento: dados.metodo_pagamento,
          comprovante_url: comprovanteUrl,
          observacoes: dados.observacoes,
        })
        .eq('id', parcelaId);

      if (updateError) throw updateError;

      // Adicionar comentário automático
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('cliente_pagamento_comentarios')
          .insert({
            parcela_id: parcelaId,
            user_id: user.id,
            comentario: `Pagamento registrado via ${dados.metodo_pagamento}`,
            tenant_id: tenantId
          });
      }

      toast({
        title: 'Pagamento registrado',
        description: 'A baixa da parcela foi registrada com sucesso.',
      });

      await fetchParcelas();
      return true;
    } catch (error) {
      console.error('Erro ao dar baixa na parcela:', error);
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Não foi possível registrar a baixa da parcela.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    parcelas,
    loading,
    fetchParcelas,
    darBaixaParcela,
  };
};

export const useParcelaComentarios = (parcelaId: string | null) => {
  const [comentarios, setComentarios] = useState<ParcelaComentario[]>([]);
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenantId();
  const { saveMentions, deleteMentions } = useCommentMentions();

  const fetchComentarios = async () => {
    if (!parcelaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cliente_pagamento_comentarios')
        .select(`
          *,
          autor:user_id(full_name, email)
        `)
        .eq('parcela_id', parcelaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map(item => ({
        ...item,
        autor: item.autor && typeof item.autor === 'object' ? {
          full_name: (item.autor as any).full_name || '',
          email: (item.autor as any).email || ''
        } : undefined
      }));
      
      setComentarios(formattedData as ParcelaComentario[]);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComentarios();
  }, [parcelaId]);

  const addComentario = async (
    comentario: string,
    mentionedUserIds?: string[],
    contextTitle?: string
  ) => {
    if (!parcelaId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: insertedComment, error } = await supabase
        .from('cliente_pagamento_comentarios')
        .insert({
          parcela_id: parcelaId,
          user_id: user.id,
          comentario,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;

      // Salvar menções e notificar
      if (mentionedUserIds?.length && insertedComment) {
        await saveMentions({
          commentType: 'parcela',
          commentId: insertedComment.id,
          mentionedUserIds,
          contextTitle,
        });
      }

      await fetchComentarios();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: 'Erro ao adicionar comentário',
        description: 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteComentario = async (comentarioId: string) => {
    try {
      // Deletar menções primeiro
      await deleteMentions('parcela', comentarioId);

      const { error } = await supabase
        .from('cliente_pagamento_comentarios')
        .delete()
        .eq('id', comentarioId);

      if (error) throw error;

      await fetchComentarios();
      return true;
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      toast({
        title: 'Erro ao deletar comentário',
        description: 'Não foi possível deletar o comentário.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    comentarios,
    loading,
    fetchComentarios,
    addComentario,
    deleteComentario,
  };
};
