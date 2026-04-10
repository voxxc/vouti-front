import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

interface AlertBoleto {
  id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  status: string;
}

export function useBillingAlert() {
  const { tenantId } = useTenantId();

  const { data, isLoading } = useQuery({
    queryKey: ['billing-alert', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const now = new Date();
      const in15Days = new Date();
      in15Days.setDate(now.getDate() + 15);

      const { data, error } = await supabase
        .from('tenant_boletos' as any)
        .select('id, mes_referencia, valor, data_vencimento, status')
        .eq('tenant_id', tenantId)
        .in('status', ['pendente', 'vencido'])
        .lte('data_vencimento', in15Days.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      return (data as unknown as AlertBoleto[]) || [];
    },
    enabled: !!tenantId,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    alertBoletos: data || [],
    alertCount: data?.length || 0,
    isLoading,
  };
}
