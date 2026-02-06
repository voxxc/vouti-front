import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClienteParcela, ParcelaComentario, DadosBaixaPagamento } from '@/types/financeiro';
import { toast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { useCommentMentions } from '@/hooks/useCommentMentions';
import { formatCurrency } from '@/lib/utils';

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

      // Buscar parcela para calcular saldo restante
      const parcela = parcelas.find(p => p.id === parcelaId);
      const valorParcela = parcela?.valor_parcela || 0;
      const valorPagoAnterior = parcela?.valor_pago || 0;
      
      // Se é pagamento parcial, considerar valor pago anterior + novo valor
      const valorPagoTotal = parcela?.status === 'parcial' 
        ? valorPagoAnterior + dados.valor_pago 
        : dados.valor_pago;
      
      const saldoRestante = valorParcela - valorPagoTotal;
      
      // Determinar status baseado no pagamento
      let novoStatus: string;
      if (dados.pagamento_parcial && saldoRestante > 0.01) {
        novoStatus = 'parcial';
      } else {
        novoStatus = 'pago';
      }

      // Atualizar parcela com valor_pago e saldo_restante
      const { error: updateError } = await supabase
        .from('cliente_parcelas')
        .update({
          status: novoStatus,
          data_pagamento: dados.data_pagamento,
          metodo_pagamento: dados.metodo_pagamento,
          valor_pago: valorPagoTotal,
          saldo_restante: saldoRestante > 0 ? saldoRestante : 0,
          comprovante_url: comprovanteUrl,
          observacoes: dados.observacoes,
        })
        .eq('id', parcelaId);

      if (updateError) throw updateError;

      // Adicionar comentário automático com detalhes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const comentario = novoStatus === 'parcial'
          ? `Pagamento parcial de ${formatCurrency(dados.valor_pago)} via ${dados.metodo_pagamento}. Saldo restante: ${formatCurrency(saldoRestante)}`
          : `Pagamento registrado via ${dados.metodo_pagamento}`;
        
        await supabase
          .from('cliente_pagamento_comentarios')
          .insert({
            parcela_id: parcelaId,
            user_id: user.id,
            comentario,
            tenant_id: tenantId
          });
      }

      toast({
        title: novoStatus === 'parcial' ? 'Pagamento parcial registrado' : 'Pagamento registrado',
        description: novoStatus === 'parcial' 
          ? `Saldo restante: ${formatCurrency(saldoRestante)}`
          : 'A baixa da parcela foi registrada com sucesso.',
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

  const reabrirParcela = async (parcelaId: string) => {
    try {
      const { error } = await supabase
        .from('cliente_parcelas')
        .update({
          status: 'pendente',
          data_pagamento: null,
          metodo_pagamento: null,
          valor_pago: null,
          comprovante_url: null,
          observacoes: null,
        })
        .eq('id', parcelaId);

      if (error) throw error;

      // Adicionar comentário automático
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('cliente_pagamento_comentarios')
          .insert({
            parcela_id: parcelaId,
            user_id: user.id,
            comentario: 'Pagamento reaberto para correção',
            tenant_id: tenantId
          });
      }

      toast({
        title: 'Pagamento reaberto',
        description: 'A parcela foi reaberta e pode ser editada.',
      });

      await fetchParcelas();
      return true;
    } catch (error) {
      console.error('Erro ao reabrir parcela:', error);
      toast({
        title: 'Erro ao reabrir pagamento',
        description: 'Não foi possível reabrir a parcela.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const excluirPagamento = async (
    parcelaId: string,
    historicoId: string,
    valorPagamento: number
  ) => {
    try {
      // Buscar parcela atual
      const parcela = parcelas.find(p => p.id === parcelaId);
      if (!parcela) throw new Error('Parcela não encontrada');

      const valorPagoAtual = parcela.valor_pago || 0;
      const novoValorPago = Math.max(0, valorPagoAtual - valorPagamento);
      const novoSaldoRestante = parcela.valor_parcela - novoValorPago;

      // Determinar novo status
      let novoStatus: string;
      if (novoValorPago <= 0) {
        novoStatus = new Date(parcela.data_vencimento) < new Date() ? 'atrasado' : 'pendente';
      } else {
        novoStatus = 'parcial';
      }

      // Atualizar parcela
      const { error: updateError } = await supabase
        .from('cliente_parcelas')
        .update({
          valor_pago: novoValorPago > 0 ? novoValorPago : null,
          saldo_restante: novoSaldoRestante,
          status: novoStatus,
          // Se voltou a pendente/atrasado, limpar dados de pagamento
          ...(novoValorPago <= 0 && {
            data_pagamento: null,
            metodo_pagamento: null,
          })
        })
        .eq('id', parcelaId);

      if (updateError) throw updateError;

      // Deletar registro do histórico
      const { error: deleteError } = await supabase
        .from('cliente_pagamento_comentarios')
        .delete()
        .eq('id', historicoId);

      if (deleteError) throw deleteError;

      // Registrar exclusão no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('cliente_pagamento_comentarios')
          .insert({
            parcela_id: parcelaId,
            user_id: user.id,
            comentario: `Pagamento de ${formatCurrency(valorPagamento)} excluído`,
            tenant_id: tenantId
          });
      }

      toast({
        title: 'Pagamento excluído',
        description: 'O registro foi removido e o saldo foi recalculado.',
      });

      await fetchParcelas();
      return true;
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      toast({
        title: 'Erro ao excluir pagamento',
        description: 'Não foi possível excluir o registro.',
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
    reabrirParcela,
    excluirPagamento,
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
