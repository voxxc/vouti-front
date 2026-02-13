import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  X,
  FileText,
  Users,
  History,
  ExternalLink,
  Building2,
  MapPin,
  Scale,
  Calendar,
  DollarSign,
  Gavel,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessoCNPJ } from '@/hooks/useCNPJs';

interface ProcessoCNPJDetalhesProps {
  processo: ProcessoCNPJ;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProcessoCNPJDetalhes = ({
  processo,
  open,
  onClose,
  onUpdate,
}: ProcessoCNPJDetalhesProps) => {
  const [activeTab, setActiveTab] = useState('resumo');
  const capa = processo.capaCompleta || {};

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  const formatValor = (valor: number | null | undefined) => {
    if (!valor) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatData = (data: string | null | undefined) => {
    if (!data) return null;
    try {
      return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  const getInstancia = (instance: string | number | null | undefined) => {
    if (!instance) return null;
    if (instance === '1' || instance === 1) return '1a Instancia';
    if (instance === '2' || instance === 2) return '2a Instancia';
    return `${instance}a Instancia`;
  };

  // Extrair partes com lógica robusta usando side + person_type
  const partesAtivas: any[] = [];
  const partesPassivas: any[] = [];
  const advogadosList: any[] = [];
  const outrasPartes: any[] = [];

  if (capa.parties && Array.isArray(capa.parties)) {
    capa.parties.forEach((parte: any) => {
      const side = (parte.side || '').toLowerCase();
      const tipo = (parte.person_type || '').toLowerCase();
      const papel = (parte.role || '').toLowerCase();

      // Advogados separados
      if (tipo.includes('advogado') || papel.includes('advogado')) {
        advogadosList.push(parte);
        return;
      }

      if (side === 'active' || tipo.includes('autor') || tipo.includes('ativo') || tipo.includes('requerente') || tipo.includes('exequente') || tipo.includes('reclamante')) {
        partesAtivas.push(parte);
      } else if (side === 'passive' || tipo.includes('réu') || tipo.includes('reu') || tipo.includes('passivo') || tipo.includes('requerido') || tipo.includes('executado') || tipo.includes('reclamado')) {
        partesPassivas.push(parte);
      } else {
        outrasPartes.push(parte);
      }
    });
  }

  const renderParteCard = (parte: any, index: number) => {
    const mainDoc = parte.main_document || parte.documents?.find((d: any) => 
      ['cpf', 'cnpj'].includes((d.document_type || '').toLowerCase())
    );
    const docValue = mainDoc?.document || mainDoc?.value || null;

    return (
      <div key={index} className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{parte.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {parte.person_type && (
                <Badge variant="outline" className="text-xs">
                  {parte.person_type}
                </Badge>
              )}
              {parte.role && parte.role !== parte.person_type && (
                <Badge variant="secondary" className="text-xs">
                  {parte.role}
                </Badge>
              )}
              {docValue && (
                <span className="text-xs text-muted-foreground">
                  {docValue}
                </span>
              )}
            </div>
          </div>
        </div>
        {parte.lawyers && parte.lawyers.length > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-primary/30">
            <p className="text-xs text-muted-foreground mb-1">Advogados:</p>
            {parte.lawyers.map((adv: any, idx: number) => {
              const oabDoc = adv.documents?.find((d: any) => 
                (d.document_type || '').toLowerCase() === 'oab'
              );
              const oabNum = oabDoc?.document || adv.oab || null;
              return (
                <p key={idx} className="text-sm">
                  {adv.name}
                  {oabNum && (
                    <span className="text-muted-foreground ml-1">
                      OAB {oabNum}
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAdvogadoCard = (adv: any, index: number) => {
    const oabDoc = adv.documents?.find((d: any) => 
      (d.document_type || '').toLowerCase() === 'oab'
    );
    const oabNum = oabDoc?.document || adv.oab || null;
    return (
      <div key={index} className="p-3 bg-muted/50 rounded-lg">
        <p className="font-medium">{adv.name}</p>
        {oabNum && (
          <Badge variant="outline" className="text-xs mt-1">
            OAB {oabNum}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-2xl overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Processo
            </SheetTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-sm">{processo.numeroCnj}</span>
            {processo.monitoramentoAtivo && (
              <Badge variant="default">Monitorado</Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="resumo" className="flex-1">
                <Scale className="h-4 w-4 mr-2" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="partes" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Partes
              </TabsTrigger>
              <TabsTrigger value="andamentos" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Andamentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-4 mt-4">
              {/* Dados do Processo */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Dados do Processo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(capa.amount || processo.valorCausa) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">
                        {formatValor(capa.amount || processo.valorCausa)}
                      </span>
                    </div>
                  )}
                  {(capa.distribution_date || processo.dataDistribuicao) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Distribuicao:</span>
                      <span>
                        {formatData(capa.distribution_date || processo.dataDistribuicao)}
                      </span>
                    </div>
                  )}
                  {processo.areaDireito && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Area:</span>
                      <Badge variant="outline">{processo.areaDireito}</Badge>
                    </div>
                  )}
                  {processo.assunto && (
                    <div>
                      <span className="text-muted-foreground">Assunto:</span>
                      <p className="mt-1">{processo.assunto}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Localizacao */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localizacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {processo.tribunal && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{processo.tribunal}</span>
                      {processo.tribunalSigla && (
                        <Badge variant="secondary">{processo.tribunalSigla}</Badge>
                      )}
                    </div>
                  )}
                  {processo.juizo && (
                    <div>
                      <span className="text-muted-foreground">Juizo:</span>
                      <span className="ml-2">{processo.juizo}</span>
                    </div>
                  )}
                  {(capa.instance || processo.instancia) && (
                    <div>
                      <span className="text-muted-foreground">Instancia:</span>
                      <span className="ml-2">
                        {getInstancia(capa.instance || processo.instancia)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Situacao Atual */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Situacao Atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {processo.statusProcessual && (
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className="ml-2">{processo.statusProcessual}</Badge>
                    </div>
                  )}
                  {processo.faseProcessual && (
                    <div>
                      <span className="text-muted-foreground">Fase:</span>
                      <span className="ml-2">{processo.faseProcessual}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ultimo Andamento */}
              {processo.ultimoAndamento && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ultimo Andamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {processo.ultimoAndamentoData && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatData(processo.ultimoAndamentoData)}
                      </p>
                    )}
                    <p className="text-sm">{processo.ultimoAndamento}</p>
                  </CardContent>
                </Card>
              )}

              {/* Link Tribunal */}
              {processo.linkTribunal && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(processo.linkTribunal!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar no Tribunal
                </Button>
              )}
            </TabsContent>

            <TabsContent value="partes" className="space-y-4 mt-4">
              {partesAtivas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Polo Ativo ({partesAtivas.length})
                  </h4>
                  <div className="space-y-2">
                    {partesAtivas.map(renderParteCard)}
                  </div>
                </div>
              )}

              {partesPassivas.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Polo Passivo ({partesPassivas.length})
                  </h4>
                  <div className="space-y-2">
                    {partesPassivas.map(renderParteCard)}
                  </div>
                </div>
              )}

              {advogadosList.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                    Advogados ({advogadosList.length})
                  </h4>
                  <div className="space-y-2">
                    {advogadosList.map(renderAdvogadoCard)}
                  </div>
                </div>
              )}

              {outrasPartes.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    Outros ({outrasPartes.length})
                  </h4>
                  <div className="space-y-2">
                    {outrasPartes.map(renderParteCard)}
                  </div>
                </div>
              )}

              {partesAtivas.length === 0 &&
                partesPassivas.length === 0 &&
                advogadosList.length === 0 &&
                outrasPartes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma parte encontrada</p>
                  </div>
                )}
            </TabsContent>

            <TabsContent value="andamentos" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Carregue os andamentos para visualizar</p>
                <p className="text-xs mt-1">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
