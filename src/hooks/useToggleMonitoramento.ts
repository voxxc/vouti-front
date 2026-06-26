import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlanoLimites } from '@/hooks/usePlanoLimites';
import { isProcessoSigiloso } from '@/utils/processoOABHelpers';

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

        // Verificar feature flag global
        const { data: flag } = await supabase
          .from('super_admin_feature_flags')
          .select('enabled')
          .eq('flag_key', 'escavador_monitoramento_enabled')
          .maybeSingle();

        const featureAtiva = !!flag?.enabled;
        const sigiloso = processo.sigiloso || isProcessoSigiloso(processo);
        const visualOnly = !featureAtiva || sigiloso || processo.apartado;

        if (visualOnly) {
          // Ativação puramente visual: apenas marca o flag local, sem chamar API externa.
          const { error: upsertError } = await supabase
            .from('processo_monitoramento_escavador')
            .upsert(
              { processo_id: processo.id, monitoramento_ativo: true },
              { onConflict: 'processo_id' }
            );
          if (upsertError) throw upsertError;
        } else {
          // ATIVAR real: consultar + salvar + mostrar
          const { data, error } = await supabase.functions.invoke(
            'escavador-ativar-e-buscar',
            {
              body: {
                processoId: processo.id,
                numeroProcesso: processo.numero_processo,
              },
            }
          );

          if (error) throw error;
          if (!data?.success) {
            throw new Error(data?.message || 'Não foi possível ativar o monitoramento');
          }
        }

        toast({
          title: "Monitoramento ativado",
          description: "Você receberá notificações de novos andamentos.",
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
