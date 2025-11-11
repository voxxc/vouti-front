import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEscavadorMonitoramento } from '@/hooks/useEscavadorMonitoramento';
import { 
  Search, 
  Bell, 
  Loader2, 
  CheckCircle,
  Eye,
  Calendar,
  DollarSign,
  FileText,
  History,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EscavadorMonitoramentoProps {
  processoId: string;
  numeroProcesso: string;
}

export const EscavadorMonitoramento = ({ 
  processoId, 
  numeroProcesso 
}: EscavadorMonitoramentoProps) => {
  const {
    monitoramento,
    atualizacoes,
    loading,
    consultando,
    ativando,
    consultarProcesso,
    ativarMonitoramento,
    marcarAtualizacaoLida
  } = useEscavadorMonitoramento(processoId);

  const handleConsultar = () => {
    consultarProcesso(numeroProcesso);
  };

  const handleAtivarMonitoramento = () => {
    ativarMonitoramento();
  };

  const atualizacoesNaoLidas = atualizacoes.filter(a => !a.lida).length;
  const movimentacoesHistoricas = atualizacoes.filter(a => a.tipo_atualizacao === 'importacao_historica');
  const atualizacoesNovas = atualizacoes.filter(a => a.tipo_atualizacao !== 'importacao_historica');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Monitoramento Escavador
              </CardTitle>
              <CardDescription>
                Consulte e monitore atualizações processuais automaticamente
              </CardDescription>
            </div>
            {monitoramento?.monitoramento_ativo && (
              <Badge className="gap-1">
                <Bell className="h-3 w-3" />
                Monitoramento Ativo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !monitoramento ? (
            <div className="text-center py-8 space-y-4">
              <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium">
                  Processo ainda não consultado no Escavador
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>⚠️ Nem todos os processos estão indexados no Escavador</p>
                  <p>✅ Funciona melhor com tribunais superiores e processos mais antigos</p>
                </div>
              </div>
              <Button 
                onClick={handleConsultar} 
                disabled={consultando}
                size="lg"
              >
                {consultando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Consultar Processo
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {monitoramento.classe && (
                  <div>
                    <p className="text-sm text-muted-foreground">Classe</p>
                    <p className="font-medium">{monitoramento.classe}</p>
                  </div>
                )}
                {monitoramento.assunto && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assunto</p>
                    <p className="font-medium truncate" title={monitoramento.assunto}>
                      {monitoramento.assunto}
                    </p>
                  </div>
                )}
                {monitoramento.area && (
                  <div>
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="font-medium">{monitoramento.area}</p>
                  </div>
                )}
                {monitoramento.tribunal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tribunal</p>
                    <p className="font-medium">{monitoramento.tribunal}</p>
                  </div>
                )}
                {monitoramento.data_distribuicao && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Distribuição
                    </p>
                    <p className="font-medium">
                      {format(new Date(monitoramento.data_distribuicao), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
                {monitoramento.valor_causa && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Valor da Causa
                    </p>
                    <p className="font-medium">
                      R$ {monitoramento.valor_causa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Última consulta</p>
                  <p className="text-sm">
                    {monitoramento.ultima_consulta 
                      ? format(new Date(monitoramento.ultima_consulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Total de atualizações</p>
                  <p className="text-2xl font-bold">{monitoramento.total_atualizacoes}</p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleConsultar}
                  disabled={consultando}
                >
                  {consultando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Reconsultar
                </Button>

                {!monitoramento.monitoramento_ativo ? (
                  <Button 
                    onClick={handleAtivarMonitoramento}
                    disabled={ativando}
                  >
                    {ativando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ativando...
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Ativar Monitoramento
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Monitoramento Ativo
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {atualizacoes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Movimentações do Processo
              </CardTitle>
              {atualizacoesNaoLidas > 0 && (
                <Badge variant="destructive">
                  {atualizacoesNaoLidas} nova{atualizacoesNaoLidas > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="todas" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="todas" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Todas ({atualizacoes.length})
                </TabsTrigger>
                <TabsTrigger value="historicas" className="gap-2">
                  <History className="h-4 w-4" />
                  Históricas ({movimentacoesHistoricas.length})
                </TabsTrigger>
                <TabsTrigger value="novas" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Novas ({atualizacoesNovas.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todas" className="space-y-3 mt-4">
                {atualizacoes.map((atualizacao) => (
                  <div
                    key={atualizacao.id}
                    className={`border rounded-lg p-4 space-y-2 ${
                      !atualizacao.lida ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={atualizacao.tipo_atualizacao === 'importacao_historica' ? 'secondary' : 'default'} className="text-xs">
                            {atualizacao.tipo_atualizacao === 'importacao_historica' ? 'Histórica' : atualizacao.tipo_atualizacao}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(atualizacao.data_evento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{atualizacao.descricao}</p>
                      </div>
                      {!atualizacao.lida && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => marcarAtualizacaoLida(atualizacao.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="historicas" className="space-y-3 mt-4">
                {movimentacoesHistoricas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma movimentação histórica importada</p>
                  </div>
                ) : (
                  movimentacoesHistoricas.map((atualizacao) => (
                    <div
                      key={atualizacao.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              Histórica
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(atualizacao.data_evento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm">{atualizacao.descricao}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="novas" className="space-y-3 mt-4">
                {atualizacoesNovas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma atualização nova recebida</p>
                  </div>
                ) : (
                  atualizacoesNovas.map((atualizacao) => (
                    <div
                      key={atualizacao.id}
                      className={`border rounded-lg p-4 space-y-2 ${
                        !atualizacao.lida ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default" className="text-xs">
                              {atualizacao.tipo_atualizacao}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(atualizacao.data_evento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm">{atualizacao.descricao}</p>
                        </div>
                        {!atualizacao.lida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarAtualizacaoLida(atualizacao.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
