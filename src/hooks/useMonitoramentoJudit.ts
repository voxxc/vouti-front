import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMonitoramentoJudit = () => {
  const [ativando, setAtivando] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleMonitoramento = async (processo: any) => {
    setAtivando(processo.id);
    
    try {
      // Verificar se já existe monitoramento
      const { data: monitoramentoExistente } = await supabase
        .from('processo_monitoramento_judit')
        .select('monitoramento_ativo')
        .eq('processo_id', processo.id)
        .single();

      const isAtivo = monitoramentoExistente?.monitoramento_ativo || false;

      if (!isAtivo) {
        // ATIVAR: buscar + ativar monitoramento
        
        // 1. Buscar processo e andamentos
        const { data: buscarData, error: buscarError } = await supabase.functions.invoke(
          'judit-buscar-processo',
          { 
            body: { 
              processoId: processo.id, 
              numeroProcesso: processo.numero_processo 
            } 
          }
        );

        if (buscarError) throw buscarError;
        
        if (!buscarData?.success) {
          throw new Error(buscarData?.error || 'Erro ao buscar processo');
        }

        // 2. Ativar monitoramento diário
        const { data: ativarData, error: ativarError } = await supabase.functions.invoke(
          'judit-ativar-monitoramento',
          { 
            body: { 
              processoId: processo.id, 
              numeroProcesso: processo.numero_processo 
            } 
          }
        );

        if (ativarError) throw ativarError;
        
        if (!ativarData?.success) {
          throw new Error(ativarData?.error || 'Erro ao ativar monitoramento');
        }

        toast({
          title: "✅ Monitoramento ativado!",
          description: `${buscarData.totalMovimentacoes} andamentos encontrados. Monitoramento diário configurado.`,
          duration: 5000,
        });
      } else {
        // DESATIVAR: apenas pausa, mantém histórico
        const { data, error } = await supabase.functions.invoke(
          'judit-desativar-monitoramento',
          { body: { processoId: processo.id } }
        );

        if (error) throw error;
        
        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao desativar monitoramento');
        }
        
        toast({
          title: "Monitoramento desativado",
          description: "Histórico de andamentos mantido.",
        });
      }
      
      return true;
      
    } catch (error: any) {
      console.error('[Toggle Monitoramento] Erro:', error);
      toast({
        title: "Erro ao alterar monitoramento",
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
      return false;
    } finally {
      setAtivando(null);
    }
  };

  return { toggleMonitoramento, ativando };
};
