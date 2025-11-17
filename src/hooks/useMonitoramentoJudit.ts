import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMonitoramentoJudit = () => {
  const [ativando, setAtivando] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleMonitoramento = async (processo: any) => {
    setAtivando(processo.id);
    
    try {
      console.log('[Judit] 🔄 Iniciando toggle para processo:', processo.numero_processo);
      
      // Verificar se já existe monitoramento
      const { data: monitoramentoExistente } = await supabase
        .from('processo_monitoramento_judit')
        .select('monitoramento_ativo')
        .eq('processo_id', processo.id)
        .single();

      const isAtivo = monitoramentoExistente?.monitoramento_ativo || false;
      console.log('[Judit] Status atual:', isAtivo ? 'ATIVO' : 'INATIVO');

      if (!isAtivo) {
        // ATIVAR: buscar + ativar monitoramento
        
        console.log('[Judit] 📡 Chamando judit-buscar-processo...');
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

        console.log('[Judit] 📥 Resposta buscar-processo:', { buscarData, buscarError });

        if (buscarError) {
          console.error('[Judit] ❌ Erro na busca:', buscarError);
          throw new Error(`Falha ao buscar processo: ${buscarError.message || JSON.stringify(buscarError)}`);
        }
        
        if (!buscarData?.success) {
          console.error('[Judit] ❌ Busca retornou erro:', buscarData);
          throw new Error(buscarData?.error || buscarData?.message || 'Processo não encontrado na Judit API');
        }

        console.log('[Judit] ✅ Processo encontrado! Total andamentos:', buscarData.totalMovimentacoes);

        console.log('[Judit] 🔔 Chamando judit-ativar-monitoramento...');
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

        console.log('[Judit] 📥 Resposta ativar-monitoramento:', { ativarData, ativarError });

        if (ativarError) {
          console.error('[Judit] ❌ Erro ao ativar:', ativarError);
          throw new Error(`Falha ao ativar monitoramento: ${ativarError.message || JSON.stringify(ativarError)}`);
        }
        
        if (!ativarData?.success) {
          console.error('[Judit] ❌ Ativação retornou erro:', ativarData);
          throw new Error(ativarData?.error || ativarData?.message || 'Erro ao ativar monitoramento diário');
        }

        console.log('[Judit] ✅ Monitoramento ativado! Tracking ID:', ativarData.trackingId);

        toast({
          title: "✅ Monitoramento ativado!",
          description: `${buscarData.totalMovimentacoes} andamentos encontrados. Monitoramento diário configurado.`,
          duration: 5000,
        });
      } else {
        // DESATIVAR: apenas pausa, mantém histórico
        console.log('[Judit] 🔕 Chamando judit-desativar-monitoramento...');
        
        const { data, error } = await supabase.functions.invoke(
          'judit-desativar-monitoramento',
          { body: { processoId: processo.id } }
        );

        console.log('[Judit] 📥 Resposta desativar-monitoramento:', { data, error });

        if (error) {
          console.error('[Judit] ❌ Erro ao desativar:', error);
          throw new Error(`Falha ao desativar: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data?.success) {
          console.error('[Judit] ❌ Desativação retornou erro:', data);
          throw new Error(data?.error || data?.message || 'Erro ao desativar monitoramento');
        }

        console.log('[Judit] ✅ Monitoramento desativado');
        
        toast({
          title: "Monitoramento desativado",
          description: "Histórico de andamentos mantido.",
        });
      }
      
      return true;
      
    } catch (error: any) {
      console.error('[Judit] 💥 ERRO COMPLETO:', error);
      console.error('[Judit] Stack trace:', error.stack);
      
      toast({
        title: "❌ Erro ao alterar monitoramento",
        description: error.message || 'Verifique o console (F12) para detalhes',
        variant: 'destructive'
      });
      return false;
    } finally {
      setAtivando(null);
    }
  };

  return { toggleMonitoramento, ativando };
};
