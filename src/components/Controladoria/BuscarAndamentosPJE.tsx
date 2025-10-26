import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Key } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjudiCredentialsSetup from './ProjudiCredentialsSetup';

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
  const [scope, setScope] = useState<'all' | 'period'>('all');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [checkingCredentials, setCheckingCredentials] = useState(true);
  const [fonte, setFonte] = useState<'pje' | 'projudi'>('pje');
  const { toast } = useToast();

  useEffect(() => {
    checkProjudiCredentials();
  }, []);

  const checkProjudiCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projudi_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('tribunal', 'TJPR')
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setHasCredentials(true);
      }
    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
    } finally {
      setCheckingCredentials(false);
    }
  };

  const isDateRangeValid = () => {
    if (scope === 'all') return true;
    if (!dataInicio || !dataFim) return false;
    return dataInicio <= dataFim;
  };

  const handleBuscar = async () => {
    setIsLoading(true);
    
    try {
      // Escolher função baseada na fonte selecionada
      const functionName = fonte === 'projudi' && hasCredentials && tribunal === 'TJPR'
        ? 'buscar-andamentos-projudi'
        : 'buscar-processos-lote';

      const body: any = fonte === 'projudi' 
        ? {
            processoId,
            numeroProcesso,
            ...(scope === 'period' && dataInicio && dataFim && {
              dataInicio: dataInicio.toISOString().split('T')[0],
              dataFim: dataFim.toISOString().split('T')[0],
            })
          }
        : {
            processos: [numeroProcesso],
            tribunal: tribunal,
            ...(scope === 'period' && dataInicio && dataFim && {
              dataInicio: dataInicio.toISOString().split('T')[0],
              dataFim: dataFim.toISOString().split('T')[0],
            })
          };

      console.log(`🔍 Iniciando busca via ${functionName}:`, {
        processoId,
        numeroProcesso,
        tribunal,
        fonte,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
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

      // Processar resposta baseado na fonte
      const processo = fonte === 'projudi' ? data?.processo : data?.processos?.[0];
      
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

      // Normalizar deduplicação: descrição + data (apenas YYYY-MM-DD)
      const existentesSet = new Set(
        existentes?.map(m => {
          const normDesc = m.descricao.trim().replace(/\s+/g, ' ').toLowerCase();
          const dateKey = new Date(m.data_movimentacao).toISOString().slice(0, 10);
          return `${normDesc}|${dateKey}`;
        }) || []
      );

      // Filtrar apenas movimentações novas
      const novasMovimentacoes = processo.movimentacoes.filter(mov => {
        const normDesc = mov.descricao.trim().replace(/\s+/g, ' ').toLowerCase();
        const dateKey = new Date(mov.data).toISOString().slice(0, 10);
        const key = `${normDesc}|${dateKey}`;
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
            metadata_completa: mov.metadata_completa,
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
      const fonteNome = processo.fonte === 'projudi_autenticado' 
        ? 'Projudi (Autenticado) 🔐' 
        : processo.fonte === 'datajud_api' 
          ? 'DataJud API' 
          : 'PJe Comunicações';
      const totalEncontradas = processo.movimentacoes.length;
      
      let descricao = `${fonteNome}: ${totalEncontradas} movimentações encontradas`;
      if (scope === 'period' && dataInicio && dataFim) {
        descricao += ` (período: ${dataInicio.toLocaleDateString('pt-BR')} - ${dataFim.toLocaleDateString('pt-BR')})`;
      } else {
        descricao += ' (todo o histórico)';
      }
      descricao += `. ${novasMovimentacoes.length} novas inseridas.`;
      
      toast({
        title: 'Andamentos atualizados',
        description: descricao,
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
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={isLoading || checkingCredentials}
            variant="default"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Buscando...' : 'Buscar Andamentos'}
            {hasCredentials && tribunal === 'TJPR' && (
              <span className="ml-1 text-xs">🔐</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto max-w-[95vw] p-0" 
          align="start"
          sideOffset={8}
        >
          <div className="p-4 space-y-4">
            {/* Alert para configurar credenciais Projudi */}
            {!hasCredentials && tribunal === 'TJPR' && (
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm text-muted-foreground">
                  Configure suas credenciais do Projudi para buscar andamentos completos automaticamente.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCredentialsDialog(true)}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Configurar Acesso Projudi
                </Button>
              </div>
            )}

            {/* Seletor de fonte (apenas para TJPR com credenciais) */}
            {hasCredentials && tribunal === 'TJPR' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Fonte de dados</label>
                <RadioGroup value={fonte} onValueChange={(v) => setFonte(v as 'pje' | 'projudi')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pje" id="pje" />
                    <label htmlFor="pje" className="text-sm cursor-pointer">
                      PJe / DataJud (Público)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="projudi" id="projudi" />
                    <label htmlFor="projudi" className="text-sm cursor-pointer">
                      Projudi (Autenticado) 🔐
                    </label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Opções de escopo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Período de busca</label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'all' | 'period')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <label htmlFor="all" className="text-sm cursor-pointer">
                  Todo o histórico
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="period" id="period" />
                <label htmlFor="period" className="text-sm cursor-pointer">
                  Filtrar por data
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Calendários (apenas se period selecionado) */}
          {scope === 'period' && (
            <div className="flex flex-row gap-4 justify-center">
              <div className="space-y-2 w-[280px]">
                <label className="text-sm font-semibold">Data Inicial</label>
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={setDataInicio}
                  initialFocus
                  className="pointer-events-auto rounded-md border"
                />
              </div>
              <div className="space-y-2 w-[280px]">
                <label className="text-sm font-semibold">Data Final</label>
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={setDataFim}
                  className="pointer-events-auto rounded-md border"
                />
              </div>
            </div>
          )}

          {/* Mensagem de validação */}
          {scope === 'period' && (!dataInicio || !dataFim) && (
            <p className="text-xs text-muted-foreground">
              Selecione ambas as datas para continuar
            </p>
          )}
          {scope === 'period' && dataInicio && dataFim && dataInicio > dataFim && (
            <p className="text-xs text-destructive">
              Data inicial deve ser anterior à data final
            </p>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScope('all');
                setDataInicio(undefined);
                setDataFim(undefined);
              }}
            >
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (isDateRangeValid()) {
                  handleBuscar();
                  setOpen(false);
                }
              }}
              disabled={!isDateRangeValid()}
            >
              Buscar
            </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog para configurar credenciais */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Acesso ao Projudi TJPR</DialogTitle>
          </DialogHeader>
          <ProjudiCredentialsSetup 
            onSuccess={() => {
              setShowCredentialsDialog(false);
              checkProjudiCredentials();
              toast({
                title: 'Credenciais configuradas!',
                description: 'Agora você pode buscar andamentos automaticamente.',
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
