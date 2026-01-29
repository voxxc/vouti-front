import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentConfirmationPendente {
  id: string;
  tenant_id: string;
  boleto_id: string;
  metodo: string;
  status: string;
  created_at: string;
}

export function useAllPaymentConfirmations() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-payment-confirmations-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .select('id, tenant_id, boleto_id, metodo, status, created_at')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PaymentConfirmationPendente[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Agrupar por tenant_id para contar por cliente
  const porTenant = (data || []).reduce((acc, item) => {
    acc[item.tenant_id] = (acc[item.tenant_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    confirmacoes: data || [],
    totalPendentes: data?.length || 0,
    porTenant,
    isLoading,
    refetch,
  };
}
