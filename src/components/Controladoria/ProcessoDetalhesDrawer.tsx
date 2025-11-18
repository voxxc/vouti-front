import { ProcessoOAB } from "@/types/busca-oab";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessoDetalhesDrawerProps {
  processo: ProcessoOAB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessoDetalhesDrawer({
  processo,
  open,
  onOpenChange,
}: ProcessoDetalhesDrawerProps) {
  if (!processo) return null;

  const handleCopyLink = () => {
    if (processo.link_tribunal) {
      navigator.clipboard.writeText(processo.link_tribunal);
      toast.success("Link copiado!");
    }
  };

  const formatarValor = (valor?: number) => {
    if (!valor) return "Não informado";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarData = (data?: string) => {
    if (!data) return "Não informado";
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const getParteTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      plaintiff: "Autor",
      defendant: "Réu",
      lawyer: "Advogado",
      witness: "Testemunha",
      expert: "Perito",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Detalhes do Processo</DrawerTitle>
          <p className="text-sm text-muted-foreground">{processo.numero_cnj}</p>
        </DrawerHeader>

        <Tabs defaultValue="resumo" className="flex-1">
          <TabsList className="grid w-full grid-cols-3 px-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-12rem)] px-4">
            <TabsContent value="resumo" className="space-y-6 mt-4">
              {/* Dados do Processo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Dados do Processo</h3>
                <div className="grid gap-3 rounded-lg border bg-card p-4">
                  {processo.acao && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ação</p>
                      <p className="font-medium">{processo.acao}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Número CNJ</p>
                    <p className="font-medium font-mono text-sm">{processo.numero_cnj}</p>
                  </div>

                  {processo.juizo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Juízo</p>
                      <p className="font-medium">{processo.juizo}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Tribunal</p>
                    <p className="font-medium">{processo.tribunal}</p>
                  </div>

                  {processo.link_tribunal && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Link no Tribunal</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(processo.link_tribunal, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor da Causa</p>
                      <p className="font-medium">{formatarValor(processo.valor_causa)}</p>
                    </div>
                    
                    {processo.valor_condenacao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Condenação</p>
                        <p className="font-medium">{formatarValor(processo.valor_condenacao)}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Data Distribuição</p>
                      <p className="font-medium">{formatarData(processo.data_distribuicao)}</p>
                    </div>
                    
                    {processo.data_criacao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Data Criação</p>
                        <p className="font-medium">{formatarData(processo.data_criacao)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1">
                      {processo.status_processual}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Partes */}
              {processo.partes && processo.partes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-base">Partes</h3>
                  <div className="space-y-2">
                    {processo.partes.map((parte, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {getParteTipo(parte.tipo)}
                              </Badge>
                              {parte.principal && (
                                <Badge variant="default" className="text-xs">
                                  CLIENTE PRINCIPAL
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium">{parte.nome}</p>
                            {parte.papel && (
                              <p className="text-sm text-muted-foreground">{parte.papel}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-3 mt-4">
              <h3 className="font-semibold text-base">Histórico de Andamentos</h3>
              
              {processo.ultimos_andamentos && processo.ultimos_andamentos.length > 0 ? (
                <div className="space-y-3">
                  {processo.ultimos_andamentos.map((andamento, index) => (
                    <div
                      key={index}
                      className="rounded-lg border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {formatarData(andamento.data_movimentacao)}
                            </Badge>
                            {andamento.tipo_movimentacao && (
                              <Badge variant="secondary" className="text-xs">
                                {andamento.tipo_movimentacao}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">
                            {andamento.descricao}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum andamento encontrado
                </div>
              )}
            </TabsContent>

            <TabsContent value="atividades" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <p>Estatísticas e atividades em breve</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}
