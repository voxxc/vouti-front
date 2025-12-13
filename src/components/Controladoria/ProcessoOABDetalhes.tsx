import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  BellOff, 
  ExternalLink, 
  FileText, 
  Users, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Scale,
  Gavel,
  Calendar,
  DollarSign,
  Shield,
  Building2,
  BookOpen,
  RefreshCw,
  ClipboardList,
  Bot,
  Paperclip,
  AlertTriangle,
  Download,
  MessageSquareWarning
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProcessoOAB, OABCadastrada, useAndamentosOAB } from '@/hooks/useOABs';
import { TarefasTab } from './TarefasTab';
import { VoutiIATab } from './VoutiIATab';
import { AndamentoAnexos } from './AndamentoAnexos';
import { useProcessoAnexos } from '@/hooks/useProcessoAnexos';

interface ProcessoOABDetalhesProps {
  processo: ProcessoOAB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMonitoramento: (processo: ProcessoOAB) => Promise<any>;
  onRefreshProcessos?: () => Promise<void>;
  onConsultarDetalhesRequest?: (processoId: string, requestId: string) => Promise<any>;
  onCarregarDetalhes?: (processoId: string, numeroCnj: string) => Promise<any>;
  oab?: OABCadastrada | null;
}

// Traduzir person_type para portugues
const getTipoParteLabel = (personType: string | undefined): string => {
  if (!personType) return 'Tipo nao informado';
  const tipo = personType.toUpperCase();
  switch (tipo) {
    case 'ATIVO': return 'Autor';
    case 'PASSIVO': return 'Reu';
    case 'ADVOGADO': return 'Advogado';
    default: return personType;
  }
};

// Badge colorido por tipo
const getTipoParteBadgeVariant = (personType: string | undefined): "default" | "secondary" | "outline" | "destructive" => {
  if (!personType) return 'outline';
  const tipo = personType.toUpperCase();
  switch (tipo) {
    case 'ATIVO': return 'default';
    case 'PASSIVO': return 'secondary';
    case 'ADVOGADO': return 'outline';
    default: return 'outline';
  }
};

// Extrair OAB/CPF/CNPJ dos documentos
const getDocumentoInfo = (documents: any[] | undefined): string | null => {
  if (!documents || documents.length === 0) return null;
  
  const oab = documents.find(d => d.document_type?.toLowerCase() === 'oab');
  if (oab) return `OAB ${oab.document}`;
  
  const cpf = documents.find(d => d.document_type?.toLowerCase() === 'cpf');
  if (cpf) return `CPF: ${cpf.document}`;
  
  const cnpj = documents.find(d => d.document_type?.toLowerCase() === 'cnpj');
  if (cnpj) return `CNPJ: ${cnpj.document}`;
  
  return null;
};

// Formatar valor monetario
const formatValor = (valor: number | null | undefined): string | null => {
  if (!valor && valor !== 0) return null;
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formatar data
const formatData = (data: string | null | undefined): string | null => {
  if (!data) return null;
  try {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return data;
  }
};

// Extrair instancia
const getInstancia = (instance: number | undefined): string | null => {
  if (!instance) return null;
  return `${instance}a Instancia`;
};

// Extrair nivel de sigilo
const getSigilo = (secrecyLevel: number | undefined): string | null => {
  if (secrecyLevel === undefined || secrecyLevel === null) return null;
  return secrecyLevel === 0 ? 'Publico' : `Nivel ${secrecyLevel} (Sigiloso)`;
};

// Extrair classificacao principal
const getClassificacao = (capa: any): string | null => {
  if (!capa?.classifications || capa.classifications.length === 0) return null;
  return capa.classifications.map((c: any) => c.name).join(', ');
};

// Extrair assuntos
const getAssuntos = (capa: any): string | null => {
  if (!capa?.subjects || capa.subjects.length === 0) return null;
  return capa.subjects.map((s: any) => s.name).join(', ');
};

// Verificar se valor e valido para exibir
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && (value.trim() === '' || value.toUpperCase() === 'NAO INFORMADO')) return false;
  return true;
};

export const ProcessoOABDetalhes = ({
  processo,
  open,
  onOpenChange,
  onToggleMonitoramento,
  onRefreshProcessos,
  onConsultarDetalhesRequest,
  onCarregarDetalhes,
  oab
}: ProcessoOABDetalhesProps) => {
  const { andamentos, loading: loadingAndamentos, fetchAndamentos, marcarComoLida, marcarTodasComoLidas } = useAndamentosOAB(processo?.id || null);
  const { anexosPorStep, downloading, downloadAnexo } = useProcessoAnexos(processo?.id || null);
  const [togglingMonitoramento, setTogglingMonitoramento] = useState(false);
  const [refreshingAndamentos, setRefreshingAndamentos] = useState(false);
  const [confirmMonitoramentoOpen, setConfirmMonitoramentoOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmacaoFinalOpen, setConfirmacaoFinalOpen] = useState(false);
  const [carregandoAndamentos, setCarregandoAndamentos] = useState(false);

  if (!processo) return null;
  
  // Get instance from capa_completa for download
  const instancia = processo.capa_completa?.instance || 1;

  const handleToggleClick = () => {
    setConfirmMonitoramentoOpen(true);
  };

  const handleConfirmToggle = async () => {
    setConfirmMonitoramentoOpen(false);
    setTogglingMonitoramento(true);
    await onToggleMonitoramento(processo);
    setTogglingMonitoramento(false);
  };

  const handleRefreshAndamentos = async () => {
    if (!processo.detalhes_request_id || !onConsultarDetalhesRequest) return;
    
    setRefreshingAndamentos(true);
    try {
      await onConsultarDetalhesRequest(processo.id, processo.detalhes_request_id);
      await fetchAndamentos();
    } finally {
      setRefreshingAndamentos(false);
    }
  };

  const handleCarregarAndamentos = async () => {
    if (!onCarregarDetalhes) return;
    
    setConfirmacaoFinalOpen(false);
    setCarregandoAndamentos(true);
    try {
      await onCarregarDetalhes(processo.id, processo.numero_cnj);
      await fetchAndamentos();
    } finally {
      setCarregandoAndamentos(false);
    }
  };

  const andamentosNaoLidos = andamentos.filter(a => !a.lida).length;
  
  // Filtrar intimacoes
  const intimacoes = andamentos.filter(a => 
    a.descricao?.toLowerCase().includes('intimação') ||
    a.descricao?.toLowerCase().includes('intimacao')
  );
  const intimacoesNaoLidas = intimacoes.filter(a => !a.lida).length;
  
  // Extrair dados da capa_completa
  const capa = processo.capa_completa || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalhes do Processo
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Cabecalho com Numero + Valor + Badges */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <p className="font-mono text-base font-semibold">{processo.numero_cnj}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {processo.tribunal_sigla && (
                <Badge variant="outline">{processo.tribunal_sigla}</Badge>
              )}
              {isValidValue(capa.state) && (
                <Badge variant="outline">{capa.state}</Badge>
              )}
              {isValidValue(capa.instance) && (
                <Badge variant="outline">{getInstancia(capa.instance)}</Badge>
              )}
            </div>
            {/* Valor da Causa em destaque */}
            {(processo.valor_causa || capa.amount) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-mono font-semibold text-green-600">
                  {formatValor(processo.valor_causa || capa.amount)}
                </span>
              </div>
            )}
          </div>

          {/* Toggle de Monitoramento */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {processo.monitoramento_ativo ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="monitoramento" className="font-medium">
                    Monitoramento Diario
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba atualizacoes automaticas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {togglingMonitoramento && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <Switch
                  id="monitoramento"
                  checked={processo.monitoramento_ativo}
                  onCheckedChange={handleToggleClick}
                  disabled={togglingMonitoramento}
                />
              </div>
            </div>
          </Card>

          {/* Modal de Confirmacao de Monitoramento */}
          <AlertDialog open={confirmMonitoramentoOpen} onOpenChange={setConfirmMonitoramentoOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {processo.monitoramento_ativo ? 'Desativar Monitoramento?' : 'Ativar Monitoramento?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {processo.monitoramento_ativo 
                    ? 'O monitoramento diario sera desativado. O historico de andamentos sera mantido.'
                    : 'O monitoramento diario sera ativado. Voce recebera notificacoes automaticas de novos andamentos.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmToggle}>
                  {processo.monitoramento_ativo ? 'Desativar' : 'Ativar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Tabs */}
          <Tabs defaultValue="resumo" className="flex-1">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="andamentos" className="relative">
                Andamentos
                {andamentosNaoLidos > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5">
                    {andamentosNaoLidos}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="partes">Partes</TabsTrigger>
              <TabsTrigger value="intimacoes" className="relative">
                Intimacoes
                {intimacoesNaoLidas > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5">
                    {intimacoesNaoLidas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
              <TabsTrigger value="vouti-ia">
                <Bot className="w-3.5 h-3.5 mr-1" />
                IA
              </TabsTrigger>
            </TabsList>

            {/* Resumo - TODAS AS INFORMACOES */}
            <TabsContent value="resumo" className="mt-4">
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-6 pr-4">
                  
                  {/* SECAO: PARTES */}
                  <SectionHeader icon={Users} title="Partes" />
                  <div className="space-y-3 pl-1">
                    <InfoItem label="Parte Ativa (Autor)" value={processo.parte_ativa} />
                    <InfoItem label="Parte Passiva (Reu)" value={processo.parte_passiva} />
                  </div>

                  <Separator />

                  {/* SECAO: DADOS DO PROCESSO */}
                  <SectionHeader icon={Scale} title="Dados do Processo" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <InfoItem label="Valor da Causa" value={formatValor(processo.valor_causa || capa.amount)} highlight />
                    <InfoItem label="Data Distribuicao" value={formatData(processo.data_distribuicao || capa.distribution_date)} />
                    <InfoItem label="Area do Direito" value={capa.area} />
                    <InfoItem label="Sistema" value={capa.system} />
                  </div>
                  <div className="space-y-3 pl-1">
                    <InfoItem label="Classe/Tipo" value={getClassificacao(capa)} />
                    <InfoItem label="Assunto(s)" value={getAssuntos(capa)} />
                  </div>

                  <Separator />

                  {/* SECAO: LOCALIZACAO */}
                  <SectionHeader icon={MapPin} title="Localizacao" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <InfoItem label="Tribunal" value={processo.tribunal || capa.court?.name} />
                    <InfoItem label="Sigla" value={processo.tribunal_sigla || capa.court?.acronym} />
                    <InfoItem label="Estado" value={capa.state} />
                    <InfoItem label="Cidade" value={capa.city} />
                    <InfoItem label="Instancia" value={getInstancia(capa.instance)} />
                  </div>
                  <div className="space-y-3 pl-1">
                    <InfoItem label="Juizo/Vara" value={processo.juizo || capa.county} />
                  </div>

                  <Separator />

                  {/* SECAO: SITUACAO ATUAL */}
                  <SectionHeader icon={Gavel} title="Situacao Atual" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <InfoItem label="Status" value={processo.status_processual || capa.situation} />
                    <InfoItem label="Fase" value={processo.fase_processual} />
                    <InfoItem label="Juiz Responsavel" value={capa.judge} />
                    <InfoItem label="Sigilo" value={getSigilo(capa.secrecy_level)} />
                  </div>
                  <div className="pl-1">
                    <InfoItem 
                      label="Justica Gratuita" 
                      value={capa.free_justice !== undefined ? (capa.free_justice ? 'Sim' : 'Nao') : null} 
                    />
                  </div>

                  {/* SECAO: ULTIMO ANDAMENTO */}
                  {capa.last_step && (
                    <>
                      <Separator />
                      <SectionHeader icon={Clock} title="Ultimo Andamento" />
                      <Card className="p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatData(capa.last_step.step_date)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{capa.last_step.content}</p>
                      </Card>
                    </>
                  )}

                  {/* SECAO: LINK TRIBUNAL */}
                  {isValidValue(processo.link_tribunal) && (
                    <>
                      <Separator />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(processo.link_tribunal!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no Tribunal
                      </Button>
                    </>
                  )}

                  {/* DEBUG: Mostrar campos extras da capa se existirem */}
                  {capa.related_lawsuits && capa.related_lawsuits.length > 0 && (
                    <>
                      <Separator />
                      <SectionHeader icon={BookOpen} title="Processos Relacionados" />
                      <div className="space-y-2 pl-1">
                        {capa.related_lawsuits.map((rel: any, idx: number) => (
                          <Card key={idx} className="p-2">
                            <p className="font-mono text-xs">{rel.code || rel.numero}</p>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Andamentos */}
            <TabsContent value="andamentos" className="mt-4">
              {/* Se nao tem request_id, mostrar botao para carregar */}
              {!processo.detalhes_request_id && onCarregarDetalhes && (
                <div className="p-6 text-center space-y-4 border rounded-lg bg-muted/20 mb-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Download className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">Andamentos nao carregados</p>
                    <p className="text-sm text-muted-foreground">
                      Os andamentos deste processo ainda nao foram buscados.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setConfirmDialogOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={carregandoAndamentos}
                  >
                    {carregandoAndamentos ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Carregar Andamentos
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Se tem request_id OU ja tem andamentos, mostrar lista */}
              {(processo.detalhes_request_id || andamentos.length > 0) && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {andamentos.length} andamento(s)
                      </p>
                      {/* Botao de atualizar andamentos (gratuito se tiver request_id) */}
                      {processo.detalhes_request_id && onConsultarDetalhesRequest && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleRefreshAndamentos}
                          disabled={refreshingAndamentos}
                          title="Atualizar andamentos"
                        >
                          {refreshingAndamentos ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    {andamentosNaoLidos > 0 && (
                      <Button variant="ghost" size="sm" onClick={marcarTodasComoLidas}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marcar todas como lidas
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="h-[calc(100vh-400px)]">
                    {loadingAndamentos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : andamentos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2" />
                        <p>Nenhum andamento encontrado</p>
                      </div>
                    ) : (
                  <div className="space-y-3 pr-4">
                    {andamentos.map((andamento) => {
                      // Get step_id from dados_completos to find linked attachments
                      const stepId = andamento.dados_completos?.id || andamento.dados_completos?.step_id;
                      const anexosDoAndamento = stepId ? (anexosPorStep.get(stepId) || []) : [];
                      const temAnexos = anexosDoAndamento.length > 0;
                      
                      return (
                        <Card 
                          key={andamento.id} 
                          className={`p-3 cursor-pointer transition-colors ${
                            !andamento.lida ? 'bg-primary/5 border-primary/20' : ''
                          }`}
                          onClick={() => !andamento.lida && marcarComoLida(andamento.id)}
                        >
                          <div className="flex items-start gap-2">
                            {!andamento.lida && (
                              <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatData(andamento.data_movimentacao) || 'Data nao informada'}
                                </span>
                                {andamento.tipo_movimentacao && (
                                  <Badge variant="outline" className="text-xs">
                                    {andamento.tipo_movimentacao}
                                  </Badge>
                                )}
                                {temAnexos && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Paperclip className="w-2.5 h-2.5" />
                                    {anexosDoAndamento.length}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{andamento.descricao}</p>
                              
                              {/* Inline attachments */}
                              {temAnexos && (
                                <AndamentoAnexos
                                  anexos={anexosDoAndamento}
                                  numeroCnj={processo.numero_cnj}
                                  instancia={instancia}
                                  downloading={downloading}
                                  onDownload={downloadAnexo}
                                />
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}

            {/* Dialogs de confirmacao para carregar andamentos */}
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Carregar Andamentos?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>Esta acao fara uma consulta para buscar os andamentos completos do processo.</p>
                    <p className="text-amber-600 dark:text-amber-400 font-medium">Esta consulta pode gerar custo.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      setConfirmDialogOpen(false);
                      setConfirmacaoFinalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmacaoFinalOpen} onOpenChange={setConfirmacaoFinalOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Confirmar Consulta?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirma que deseja carregar os andamentos do processo{' '}
                    <span className="font-mono text-xs">{processo.numero_cnj}</span>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleCarregarAndamentos}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Sim, Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

            {/* Intimacoes - Filtro de andamentos que sao intimacoes */}
            <TabsContent value="intimacoes" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                {intimacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquareWarning className="w-8 h-8 mx-auto mb-2" />
                    <p>Nenhuma intimacao encontrada</p>
                    <p className="text-xs mt-1">As intimacoes aparecerao aqui quando forem identificadas nos andamentos</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        {intimacoes.length} intimacao(es) encontrada(s)
                      </p>
                      {intimacoesNaoLidas > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            intimacoes.filter(i => !i.lida).forEach(i => marcarComoLida(i.id));
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marcar como lidas
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3 pr-4">
                      {intimacoes.map((andamento) => {
                        const stepId = andamento.dados_completos?.id || andamento.dados_completos?.step_id;
                        const anexosDoAndamento = stepId ? (anexosPorStep.get(stepId) || []) : [];
                        const temAnexos = anexosDoAndamento.length > 0;
                        
                        return (
                          <Card 
                            key={andamento.id} 
                            className={`p-3 cursor-pointer transition-colors border-l-4 border-l-amber-500 ${
                              !andamento.lida ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''
                            }`}
                            onClick={() => !andamento.lida && marcarComoLida(andamento.id)}
                          >
                            <div className="flex items-start gap-2">
                              {!andamento.lida && (
                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatData(andamento.data_movimentacao) || 'Data nao informada'}
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300">
                                    Intimacao
                                  </Badge>
                                  {temAnexos && (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <Paperclip className="w-2.5 h-2.5" />
                                      {anexosDoAndamento.length}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm">{andamento.descricao}</p>
                                
                                {temAnexos && (
                                  <AndamentoAnexos
                                    anexos={anexosDoAndamento}
                                    numeroCnj={processo.numero_cnj}
                                    instancia={instancia}
                                    downloading={downloading}
                                    onDownload={downloadAnexo}
                                  />
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Partes - Separadas por Polo */}
            <TabsContent value="partes" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-6 pr-4">
                  {processo.partes_completas && Array.isArray(processo.partes_completas) ? (
                    (() => {
                      // Agrupar partes por tipo (Polo Ativo vs Polo Passivo)
                      const autores: any[] = [];
                      const reus: any[] = [];
                      const outros: any[] = [];
                      
                      processo.partes_completas.forEach((parte: any) => {
                        const tipo = parte.person_type?.toUpperCase();
                        if (tipo === 'ATIVO') {
                          autores.push(parte);
                        } else if (tipo === 'PASSIVO') {
                          reus.push(parte);
                        } else if (tipo !== 'ADVOGADO') {
                          outros.push(parte);
                        }
                      });

                      return (
                        <>
                          {/* POLO ATIVO (Autores) */}
                          {autores.length > 0 && (
                            <PoloSection 
                              titulo="Polo Ativo (Autores)" 
                              partes={autores} 
                              corBorda="border-blue-500"
                            />
                          )}

                          {/* POLO PASSIVO (Reus) */}
                          {reus.length > 0 && (
                            <PoloSection 
                              titulo="Polo Passivo (Reus)" 
                              partes={reus} 
                              corBorda="border-muted-foreground"
                            />
                          )}

                          {/* OUTROS PARTICIPANTES */}
                          {outros.length > 0 && (
                            <PoloSection 
                              titulo="Outros Participantes" 
                              partes={outros} 
                              corBorda="border-yellow-500"
                            />
                          )}

                          {/* Se nao houver partes agrupadas, mostra vazio */}
                          {autores.length === 0 && reus.length === 0 && outros.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="w-8 h-8 mx-auto mb-2" />
                              <p>Nenhuma parte encontrada</p>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p>Informacoes de partes nao disponiveis</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Vouti IA */}
            <TabsContent value="vouti-ia" className="mt-4">
              <VoutiIATab processoOabId={processo.id} />
            </TabsContent>

            {/* Tarefas */}
            <TabsContent value="tarefas" className="mt-4">
              <TarefasTab processo={processo} oab={oab || null} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Componente de cabecalho de secao
const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
  </div>
);

// Componente de item de informacao
const InfoItem = ({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) => {
  if (!isValidValue(value)) return null;
  
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'font-semibold text-green-600' : ''}`}>{value}</p>
    </div>
  );
};

// Componente de secao de polo (Ativo/Passivo)
const PoloSection = ({ 
  titulo, 
  partes, 
  corBorda 
}: { 
  titulo: string; 
  partes: any[]; 
  corBorda: string;
}) => {
  if (partes.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${corBorda}`}>
        <Users className="w-4 h-4" />
        <h3 className="font-semibold text-sm uppercase tracking-wide">
          {titulo} ({partes.length})
        </h3>
      </div>
      {partes.map((parte, index) => (
        <ParteCard key={index} parte={parte} />
      ))}
    </div>
  );
};

// Componente de card de parte individual
const ParteCard = ({ parte }: { parte: any }) => (
  <Card className="p-3">
    <div className="flex items-start gap-2">
      <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-sm">{parte.name || parte.nome}</p>
          <Badge variant={getTipoParteBadgeVariant(parte.person_type)}>
            {getTipoParteLabel(parte.person_type)}
          </Badge>
        </div>
        {getDocumentoInfo(parte.documents) && (
          <p className="text-xs text-muted-foreground">
            {getDocumentoInfo(parte.documents)}
          </p>
        )}
        {parte.lawyers && parte.lawyers.length > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-primary/30">
            <p className="text-xs font-medium mb-1 flex items-center gap-1">
              <Scale className="w-3 h-3" />
              Advogados ({parte.lawyers.length}):
            </p>
            {parte.lawyers.map((adv: any, i: number) => (
              <div key={i} className="flex items-center gap-1 text-xs py-0.5">
                <span>{adv.name}</span>
                {getDocumentoInfo(adv.documents) && (
                  <span className="text-muted-foreground">
                    - {getDocumentoInfo(adv.documents)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </Card>
);
