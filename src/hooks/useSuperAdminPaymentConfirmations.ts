import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentConfirmationWithBoleto {
  id: string;
  boleto_id: string;
  tenant_id: string;
  metodo: 'pix' | 'boleto';
  data_confirmacao: string;
  comprovante_path: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacao_admin: string | null;
  created_at: string;
  updated_at: string;
  boleto: {
    mes_referencia: string;
    valor: number;
    data_vencimento: string;
  } | null;
}

export function useSuperAdminPaymentConfirmations(tenantId: string | null) {
  const [confirmacoes, setConfirmacoes] = useState<PaymentConfirmationWithBoleto[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchConfirmacoes = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // First fetch confirmations
      const { data: confirmData, error: confirmError } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (confirmError) throw confirmError;

      // Then fetch boletos for these confirmations
      const confirmacoes = confirmData as unknown as PaymentConfirmationWithBoleto[];
      const boletoIds = [...new Set(confirmacoes.map(c => c.boleto_id))];

      if (boletoIds.length > 0) {
        const { data: boletosData, error: boletosError } = await supabase
          .from('tenant_boletos')
          .select('id, mes_referencia, valor, data_vencimento')
          .in('id', boletoIds);

        if (boletosError) throw boletosError;

        // Map boletos to confirmations
        const boletosMap = new Map(boletosData?.map(b => [b.id, b]));
        confirmacoes.forEach(c => {
          c.boleto = boletosMap.get(c.boleto_id) || null;
        });
      }

      setConfirmacoes(confirmacoes);
    } catch (error: any) {
      console.error('Erro ao buscar confirmações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as confirmações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchConfirmacoes();
  }, [fetchConfirmacoes]);

  const aprovarConfirmacao = async (confirmacaoId: string, boletoId: string): Promise<boolean> => {
    try {
      // 1. Update confirmation status
      const { error: confirmError } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .update({ status: 'aprovado' } as any)
        .eq('id', confirmacaoId);

      if (confirmError) throw confirmError;

      // 2. Update boleto status to 'pago'
      const { error: boletoError } = await supabase
        .from('tenant_boletos')
        .update({ status: 'pago' })
        .eq('id', boletoId);

      if (boletoError) throw boletoError;

      toast({ title: 'Pagamento aprovado com sucesso!' });
      await fetchConfirmacoes();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const rejeitarConfirmacao = async (confirmacaoId: string, observacao: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .update({ 
          status: 'rejeitado',
          observacao_admin: observacao 
        } as any)
        .eq('id', confirmacaoId);

      if (error) throw error;

      toast({ title: 'Confirmação rejeitada' });
      await fetchConfirmacoes();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const getComprovanteUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('tenant-comprovantes-pagamento')
        .createSignedUrl(path, 60 * 5); // 5 minutos

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar comprovante',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  return {
    confirmacoes,
    loading,
    fetchConfirmacoes,
    aprovarConfirmacao,
    rejeitarConfirmacao,
    getComprovanteUrl
  };
}
