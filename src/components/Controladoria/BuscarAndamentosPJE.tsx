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
      console.log('Buscando andamentos via buscar-processos-lote...');

      // Usar a edge function unificada que tenta DataJud primeiro e depois PJe
      const { data, error } = await supabase.functions.invoke('buscar-processos-lote', {
        body: {
          processos: [numeroProcesso],
          tribunal: tribunal,
        },
      });

      if (error) throw error;

      const processo = data?.processos?.[0];
      
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
          },
        }));

        const { error: insertError } = await supabase
          .from('processo_movimentacoes')
          .insert(movimentacoesParaInserir);

        if (insertError) throw insertError;
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
      console.error('Erro ao buscar andamentos:', error);
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
