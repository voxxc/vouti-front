import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanoLimites } from '@/hooks/usePlanoLimites';

export const useToggleMonitoramento = () => {
  const [ativando, setAtivando] = useState<string | null>(null);
  const { toast } = useToast();
  const { podeMonitorarProcesso } = usePlanoLimites();

  const toggleMonitoramento = async (processo: any) => {
    setAtivando(processo.id);
    
    try {
      if (!processo.monitoramento_ativo) {
        // Verificar limite do plano
        if (!podeMonitorarProcesso()) {
          toast({
            title: "Limite atingido",
            description: "Você atingiu o limite de processos monitorados do seu plano.",
            variant: 'destructive'
          });
          return false;
        }
        
        // ATIVAR: consultar + salvar + mostrar
        const { data, error } = await supabase.functions.invoke(
          'escavador-ativar-e-buscar',
          { 
            body: { 
              processoId: processo.id, 
              numeroProcesso: processo.numero_processo 
            } 
          }
        );

        if (error) throw error;
        
        if (!data?.success) {
          throw new Error(data?.message || 'Processo não encontrado no Escavador');
        }

        toast({
          title: "✅ Monitoramento ativado!",
          description: `${data.totalMovimentacoes} movimentações encontradas e salvas.`,
          duration: 5000,
        });
      } else {
        // DESATIVAR: apenas flag, mantém histórico
        const { error } = await supabase
          .from('processo_monitoramento_escavador')
          .update({ monitoramento_ativo: false })
          .eq('processo_id', processo.id);

        if (error) throw error;
        
        toast({
          title: "Monitoramento desativado",
          description: "Histórico de movimentações mantido.",
        });
      }
      
      return true;
      
    } catch (error: any) {
      console.error('[Toggle] Erro:', error);
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
