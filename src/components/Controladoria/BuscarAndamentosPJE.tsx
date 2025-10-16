import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

interface BuscarAndamentosPJEProps {
  processoId: string;
  numeroProcesso: string;
  tribunal: string;
  onComplete?: () => void;
}

export const BuscarAndamentosPJE = ({
  processoId,
  numeroProcesso,
  tribunal,
  onComplete
}: BuscarAndamentosPJEProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleBuscar = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Iniciando busca de andamentos:', {
        processoId,
        numeroProcesso,
        tribunal,
        timestamp: new Date().toISOString()
      });

      // Usar a edge function unificada que tenta DataJud primeiro e depois PJe
      const { data, error } = await supabase.functions.invoke('buscar-processos-lote', {
        body: {
          processos: [numeroProcesso],
          tribunal: tribunal,
        },
      });

      console.log('📦 Resposta da Edge Function recebida:', {
        sucesso: !error,
        temDados: !!data,
        erro: error?.message
      });

      if (error) {
        console.error('❌ Erro na chamada da Edge Function:', error);
        throw error;
      }

      const processo = data?.processos?.[0];
      
      console.log('📋 Processo retornado:', {
        encontrado: !!processo,
        sucesso: processo?.success,
        fonte: processo?.fonte,
        totalMovimentacoes: processo?.movimentacoes?.length || 0,
        erro: processo?.erro
      });
      
      if (!processo || !processo.success) {
        throw new Error(processo?.erro || 'Não foi possível buscar andamentos do processo');
      }

      // Buscar movimentações existentes para evitar duplicatas
      const { data: existentes } = await supabase
        .from('processo_movimentacoes')
        .select('descricao, data_movimentacao')
        .eq('processo_id', processoId);

      const existentesSet = new Set(
        existentes?.map(m => `${m.descricao}|${m.data_movimentacao}`) || []
      );

      // Filtrar apenas movimentações novas
      const novasMovimentacoes = processo.movimentacoes.filter(mov => {
        const key = `${mov.descricao}|${new Date(mov.data).toISOString()}`;
        return !existentesSet.has(key);
      });

      console.log('🔄 Deduplicação concluída:', {
        totalEncontradas: processo.movimentacoes.length,
        existentes: existentes?.length || 0,
        novas: novasMovimentacoes.length
      });

      // Inserir novas movimentações
      if (novasMovimentacoes.length > 0) {
        const movimentacoesParaInserir = novasMovimentacoes.map(mov => ({
          processo_id: processoId,
          tipo: mov.tipo || 'intimacao',
          data_movimentacao: new Date(mov.data).toISOString(),
          descricao: mov.descricao,
          is_automated: true,
          status_conferencia: 'pendente',
          metadata: {
            fonte: processo.fonte,
            sequencia: mov.sequencia,
            texto_completo: mov.texto_completo,
          },
        }));

        const { error: insertError } = await supabase
          .from('processo_movimentacoes')
          .insert(movimentacoesParaInserir);

        if (insertError) {
          console.error('❌ Erro ao inserir movimentações:', insertError);
          throw insertError;
        }

        console.log('✅ Movimentações inseridas com sucesso:', {
          quantidade: novasMovimentacoes.length,
          statusConferencia: 'pendente',
          fonte: processo.fonte
        });
      } else {
        console.log('ℹ️ Nenhuma movimentação nova para inserir');
      }

      // Feedback detalhado
      const fonteNome = processo.fonte === 'datajud_api' ? 'DataJud API' : 'PJe Comunicações';
      const totalEncontradas = processo.movimentacoes.length;
      
      toast({
        title: 'Andamentos atualizados',
        description: `${fonteNome}: ${totalEncontradas} movimentações encontradas. ${novasMovimentacoes.length} novas inseridas.`,
      });

      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('💥 Erro completo na busca de andamentos:', {
        mensagem: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Erro ao buscar andamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBuscar}
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Buscando...' : 'Buscar Andamentos PJE'}
    </Button>
  );
};
