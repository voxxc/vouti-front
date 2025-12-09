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
  Loader2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProcessoOAB, useAndamentosOAB } from '@/hooks/useOABs';

interface ProcessoOABDetalhesProps {
  processo: ProcessoOAB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMonitoramento: (processo: ProcessoOAB) => Promise<void>;
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

export const ProcessoOABDetalhes = ({
  processo,
  open,
  onOpenChange,
  onToggleMonitoramento
}: ProcessoOABDetalhesProps) => {
  const { andamentos, loading: loadingAndamentos, marcarComoLida, marcarTodasComoLidas } = useAndamentosOAB(processo?.id || null);
  const [togglingMonitoramento, setTogglingMonitoramento] = useState(false);

  if (!processo) return null;

  const handleToggleMonitoramento = async () => {
    setTogglingMonitoramento(true);
    await onToggleMonitoramento(processo);
    setTogglingMonitoramento(false);
  };

  const andamentosNaoLidos = andamentos.filter(a => !a.lida).length;

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
          {/* Numero do Processo com Valor */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="font-mono text-sm font-medium">{processo.numero_cnj}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {processo.tribunal_sigla && (
                <Badge variant="outline">{processo.tribunal_sigla}</Badge>
              )}
              {processo.valor_causa && (
                <Badge variant="secondary" className="font-mono">
                  R$ {processo.valor_causa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              )}
            </div>
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
                  onCheckedChange={handleToggleMonitoramento}
                  disabled={togglingMonitoramento}
                />
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="resumo" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
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
            </TabsList>

            {/* Resumo */}
            <TabsContent value="resumo" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-4 pr-4">
                  <InfoItem label="Parte Ativa (Autor)" value={processo.parte_ativa} />
                  <InfoItem label="Parte Passiva (Reu)" value={processo.parte_passiva} />
                  <InfoItem label="Tribunal" value={processo.tribunal} />
                  <InfoItem label="Juizo" value={processo.juizo} />
                  <InfoItem label="Status" value={processo.status_processual} />
                  <InfoItem label="Fase" value={processo.fase_processual} />
                  <InfoItem 
                    label="Data Distribuicao" 
                    value={processo.data_distribuicao 
                      ? format(new Date(processo.data_distribuicao), "dd/MM/yyyy", { locale: ptBR })
                      : null
                    } 
                  />
                  <InfoItem 
                    label="Valor da Causa" 
                    value={processo.valor_causa 
                      ? `R$ ${processo.valor_causa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : null
                    } 
                  />
                  
                  {processo.link_tribunal && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(processo.link_tribunal!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver no Tribunal
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Andamentos */}
            <TabsContent value="andamentos" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {andamentos.length} andamento(s)
                </p>
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
                    {andamentos.map((andamento) => (
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
                                {andamento.data_movimentacao 
                                  ? format(new Date(andamento.data_movimentacao), "dd/MM/yyyy", { locale: ptBR })
                                  : 'Data nao informada'
                                }
                              </span>
                              {andamento.tipo_movimentacao && (
                                <Badge variant="outline" className="text-xs">
                                  {andamento.tipo_movimentacao}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{andamento.descricao}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Partes */}
            <TabsContent value="partes" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-4 pr-4">
                  {processo.partes_completas && Array.isArray(processo.partes_completas) ? (
                    processo.partes_completas.map((parte: any, index: number) => (
                      <Card key={index} className="p-3">
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
                              <div className="mt-2 pl-3 border-l-2 border-muted">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Advogados:</p>
                                {parte.lawyers.map((adv: any, i: number) => (
                                  <div key={i} className="flex items-center gap-1 text-xs">
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
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p>Informacoes de partes nao disponiveis</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
};
