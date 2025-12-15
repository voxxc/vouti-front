import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertCircle, 
  Calendar, 
  CalendarPlus, 
  CheckCircle2, 
  Clock, 
  Paperclip,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { 
  parseIntimacao, 
  getUrgenciaBadgeClasses, 
  getUrgenciaLabel,
  IntimacaoParsed 
} from '@/utils/intimacaoParser';
import { AndamentoAnexos } from './AndamentoAnexos';
import { ProcessoAnexo } from '@/hooks/useProcessoAnexos';

interface IntimacaoCardProps {
  andamento: {
    id: string;
    descricao: string | null;
    data_movimentacao: string | null;
    lida: boolean;
    dados_completos?: any;
  };
  processoOabId: string;
  numeroCnj: string;
  instancia: number;
  anexos: ProcessoAnexo[];
  downloading: string | null;
  onDownload: (anexo: ProcessoAnexo, numeroCnj: string, instancia: number) => void;
  onMarcarLida: (id: string) => void;
}

export const IntimacaoCard = ({
  andamento,
  processoOabId,
  numeroCnj,
  instancia,
  anexos,
  downloading,
  onDownload,
  onMarcarLida,
}: IntimacaoCardProps) => {
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  const [expanded, setExpanded] = useState(false);
  const [criarPrazoOpen, setCriarPrazoOpen] = useState(false);
  const [criandoPrazo, setCriandoPrazo] = useState(false);
  const [prazoTitulo, setPrazoTitulo] = useState('');
  const [prazoDescricao, setPrazoDescricao] = useState('');
  const [prazoData, setPrazoData] = useState('');

  const parsed = parseIntimacao(andamento.descricao);
  const temAnexos = anexos.length > 0;

  const formatData = (data: string | Date | null | undefined): string => {
    if (!data) return 'Data nao informada';
    try {
      const date = typeof data === 'string' ? new Date(data) : data;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return String(data);
    }
  };

  const handleAbrirCriarPrazo = () => {
    // Pre-fill with intimacao data
    setPrazoTitulo(`Intimacao - ${numeroCnj}`);
    setPrazoDescricao(andamento.descricao || '');
    if (parsed.dataFinal) {
      setPrazoData(format(parsed.dataFinal, 'yyyy-MM-dd'));
    }
    setCriarPrazoOpen(true);
  };

  const handleCriarPrazo = async () => {
    if (!prazoTitulo || !prazoData) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha o titulo e a data do prazo',
        variant: 'destructive',
      });
      return;
    }

    setCriandoPrazo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Get default project for deadlines
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

      const projectId = projects?.[0]?.id;
      if (!projectId) {
        toast({
          title: 'Projeto nao encontrado',
          description: 'Crie um projeto primeiro para adicionar prazos',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('deadlines')
        .insert({
          title: prazoTitulo,
          description: prazoDescricao,
          date: prazoData,
          project_id: projectId,
          processo_oab_id: processoOabId,
          user_id: user.id,
          tenant_id: tenantId,
          completed: false,
        });

      if (error) throw error;

      toast({
        title: 'Prazo criado',
        description: 'O prazo foi adicionado a sua agenda',
      });
      setCriarPrazoOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar prazo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCriandoPrazo(false);
    }
  };

  // Calculate progress bar percentage
  const getProgressPercentage = (): number => {
    if (!parsed.dataInicial || !parsed.dataFinal) return 0;
    if (parsed.vencida) return 100;
    if (parsed.prazoDias === null || parsed.diasRestantes === null) return 0;
    
    const diasPassados = parsed.prazoDias - parsed.diasRestantes;
    return Math.min(100, Math.max(0, (diasPassados / parsed.prazoDias) * 100));
  };

  const getBorderColor = () => {
    if (parsed.status === 'FECHADO') return 'border-l-green-500';
    switch (parsed.urgencia) {
      case 'critica': return 'border-l-red-500';
      case 'alta': return 'border-l-orange-500';
      case 'media': return 'border-l-yellow-500';
      case 'baixa': return 'border-l-green-500';
      default: return 'border-l-amber-500';
    }
  };

  const getBackgroundColor = () => {
    if (parsed.status === 'FECHADO') return 'bg-green-50/50 dark:bg-green-950/10';
    if (!andamento.lida) {
      switch (parsed.urgencia) {
        case 'critica': return 'bg-red-50 dark:bg-red-950/20';
        case 'alta': return 'bg-orange-50 dark:bg-orange-950/20';
        default: return 'bg-amber-50 dark:bg-amber-950/20';
      }
    }
    return '';
  };

  return (
    <>
      <Card 
        className={`p-3 cursor-pointer transition-colors border-l-4 ${getBorderColor()} ${getBackgroundColor()}`}
        onClick={() => !andamento.lida && onMarcarLida(andamento.id)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!andamento.lida && parsed.urgencia && (
                <AlertCircle className={`w-4 h-4 shrink-0 ${
                  parsed.urgencia === 'critica' ? 'text-red-600' :
                  parsed.urgencia === 'alta' ? 'text-orange-600' :
                  'text-amber-600'
                }`} />
              )}
              {parsed.status === 'FECHADO' && (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              )}
              <span className="text-xs text-muted-foreground">
                {formatData(andamento.data_movimentacao)}
              </span>
              
              {/* Status Badge */}
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  parsed.status === 'FECHADO' 
                    ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' 
                    : getUrgenciaBadgeClasses(parsed.urgencia)
                }`}
              >
                {parsed.status === 'FECHADO' ? 'Cumprida' : 'Pendente'}
              </Badge>

              {/* Urgencia Badge */}
              {parsed.status === 'ABERTO' && parsed.diasRestantes !== null && (
                <Badge variant="outline" className={`text-xs ${getUrgenciaBadgeClasses(parsed.urgencia)}`}>
                  {getUrgenciaLabel(parsed.urgencia, parsed.diasRestantes, parsed.vencida)}
                </Badge>
              )}

              {temAnexos && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Paperclip className="w-2.5 h-2.5" />
                  {anexos.length}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {parsed.status === 'ABERTO' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAbrirCriarPrazo();
                  }}
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                  Criar Prazo
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Prazo Info */}
          {(parsed.prazoDias || parsed.dataFinal) && parsed.status === 'ABERTO' && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs">
                {parsed.prazoDias && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Prazo: {parsed.prazoDias} dias
                  </div>
                )}
                {parsed.dataInicial && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Inicio: {formatData(parsed.dataInicial)}
                  </div>
                )}
                {parsed.dataFinal && (
                  <div className={`flex items-center gap-1 font-medium ${
                    parsed.vencida ? 'text-red-600' : 
                    parsed.diasRestantes !== null && parsed.diasRestantes <= 3 ? 'text-red-600' :
                    'text-muted-foreground'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Vence: {formatData(parsed.dataFinal)}
                  </div>
                )}
              </div>
              
              {/* Progress bar */}
              {parsed.dataInicial && parsed.dataFinal && (
                <Progress 
                  value={getProgressPercentage()} 
                  className={`h-1.5 ${
                    parsed.vencida ? '[&>div]:bg-red-500' :
                    parsed.urgencia === 'critica' ? '[&>div]:bg-red-500' :
                    parsed.urgencia === 'alta' ? '[&>div]:bg-orange-500' :
                    parsed.urgencia === 'media' ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-green-500'
                  }`}
                />
              )}
            </div>
          )}

          {/* Status Code */}
          {parsed.statusCodigo && (
            <div className="text-xs text-muted-foreground">
              Motivo: {parsed.statusCodigo}
            </div>
          )}

          {/* Description - collapsed by default */}
          {expanded && (
            <div className="pt-2 border-t">
              <p className="text-sm whitespace-pre-wrap">{andamento.descricao}</p>
              
              {temAnexos && (
                <AndamentoAnexos
                  anexos={anexos}
                  numeroCnj={numeroCnj}
                  instancia={instancia}
                  downloading={downloading}
                  onDownload={onDownload}
                />
              )}
            </div>
          )}

          {/* Preview when collapsed */}
          {!expanded && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {andamento.descricao?.substring(0, 150)}...
            </p>
          )}
        </div>
      </Card>

      {/* Dialog para criar prazo */}
      <Dialog open={criarPrazoOpen} onOpenChange={setCriarPrazoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" />
              Criar Prazo na Agenda
            </DialogTitle>
            <DialogDescription>
              Adicione esta intimacao como um prazo na sua agenda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                value={prazoTitulo}
                onChange={(e) => setPrazoTitulo(e.target.value)}
                placeholder="Titulo do prazo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data do Prazo *</Label>
              <Input
                id="data"
                type="date"
                value={prazoData}
                onChange={(e) => setPrazoData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={prazoDescricao}
                onChange={(e) => setPrazoDescricao(e.target.value)}
                placeholder="Descricao do prazo"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarPrazoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarPrazo} disabled={criandoPrazo}>
              {criandoPrazo ? 'Criando...' : 'Criar Prazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
