import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const handleBuscar = async () => {
    // Validação de datas
    if (dataInicio && dataFim && dataInicio > dataFim) {
      toast({
        title: 'Datas inválidas',
        description: 'A data inicial não pode ser posterior à data final.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setOpen(false);
    
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
          dataInicio: dataInicio?.toISOString(),
          dataFim: dataFim?.toISOString(),
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
      const periodoTexto = dataInicio 
        ? `de ${format(dataInicio, 'dd/MM/yyyy', { locale: ptBR })} até ${format(dataFim!, 'dd/MM/yyyy', { locale: ptBR })}`
        : 'todo o período disponível';
      
      toast({
        title: 'Andamentos atualizados',
        description: `${fonteNome}: ${totalEncontradas} movimentações encontradas (${periodoTexto}). ${novasMovimentacoes.length} novas inseridas.`,
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

  const limparFiltros = () => {
    setDataInicio(undefined);
    setDataFim(new Date());
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className={cn(
              "gap-2",
              dataInicio && "border-primary"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {dataInicio ? (
              <span className="text-xs">
                {format(dataInicio, 'dd/MM/yy')} - {format(dataFim || new Date(), 'dd/MM/yy')}
              </span>
            ) : (
              'Filtrar Período'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Data Inicial</p>
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={setDataInicio}
                locale={ptBR}
                disabled={(date) => date > new Date()}
                className="pointer-events-auto"
              />
            </div>
            
            <div>
              <p className="text-sm font-semibold mb-2">Data Final</p>
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={setDataFim}
                locale={ptBR}
                disabled={(date) => date > new Date() || (dataInicio && date < dataInicio)}
                className="pointer-events-auto"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={limparFiltros}
                className="flex-1"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        onClick={handleBuscar}
        disabled={isLoading}
        variant="default"
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Buscando...' : 'Buscar Andamentos'}
      </Button>
    </div>
  );
};
