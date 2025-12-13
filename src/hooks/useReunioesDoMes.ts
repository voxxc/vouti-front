import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useTenantId } from './useTenantId';

export const useReunioesDoMes = (mesReferencia: Date) => {
  const [diasComReunioes, setDiasComReunioes] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenantId();

  const fetchReunioesDoMes = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const inicioMes = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');
      const fimMes = format(endOfMonth(mesReferencia), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('reunioes')
        .select('data')
        .eq('tenant_id', tenantId)
        .eq('situacao_agenda', 'ativa')
        .gte('data', inicioMes)
        .lte('data', fimMes);

      if (error) throw error;

      // Mapear para objetos Date únicos
      const diasUnicos = [...new Set(data?.map(r => r.data) || [])].map(dataStr => {
        const [year, month, day] = dataStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      });

      setDiasComReunioes(diasUnicos);
    } catch (error) {
      console.error('Erro ao buscar reunioes do mes:', error);
    } finally {
      setLoading(false);
    }
  }, [mesReferencia, tenantId]);

  useEffect(() => {
    fetchReunioesDoMes();
  }, [fetchReunioesDoMes]);

  // Real-time subscription para atualizar quando reuniões mudam
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('reunioes-calendario-mes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reunioes' },
        () => {
          fetchReunioesDoMes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchReunioesDoMes]);

  return { diasComReunioes, loading };
};
