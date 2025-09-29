import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Upload, RefreshCw, CheckCircle2, AlertCircle, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessInfo {
  numero: string;
  status: string;
  ultimaMovimentacao: Date;
  tribunal: string;
  descricao: string;
  andamentos: ProcessMovement[];
}

interface ProcessMovement {
  data: Date;
  descricao: string;
  tipo: 'despacho' | 'decisao' | 'peticao' | 'audiencia' | 'sentenca';
}

interface PJEProcessUpdaterProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
}

const PJEProcessUpdater = ({ isOpen, onClose, clientName }: PJEProcessUpdaterProps) => {
  const { toast } = useToast();
  const [processList, setProcessList] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [processResults, setProcessResults] = useState<ProcessInfo[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);

  const handleProcessSearch = async () => {
    if (!processList.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma lista de processos.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchCompleted(false);

    try {
      // Parse da lista de processos
      const processNumbers = processList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Simular busca no PJE (substituir por integração real)
      const results: ProcessInfo[] = await Promise.all(
        processNumbers.map(async (numero, index) => {
          // Simular delay de busca
          await new Promise(resolve => setTimeout(resolve, 1000 + (index * 500)));

          // Dados mockados - substituir por busca real no PJE
          return {
            numero,
            status: Math.random() > 0.5 ? 'Em andamento' : 'Suspenso',
            ultimaMovimentacao: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            tribunal: 'TRT 2ª Região',
            descricao: `Processo relacionado a ${clientName}`,
            andamentos: [
              {
                data: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                descricao: 'Juntada de documentos',
                tipo: 'peticao'
              },
              {
                data: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
                descricao: 'Despacho do juiz',
                tipo: 'despacho'
              }
            ]
          };
        })
      );

      setProcessResults(results);
      setSearchCompleted(true);

      toast({
        title: "Busca concluída",
        description: `${results.length} processos atualizados com sucesso.`,
      });

    } catch (error) {
      console.error('Error searching processes:', error);
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar processos no PJE. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'em andamento': return 'bg-green-100 text-green-800';
      case 'suspenso': return 'bg-yellow-100 text-yellow-800';
      case 'arquivado': return 'bg-gray-100 text-gray-800';
      case 'sentenciado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMovementIcon = (tipo: string) => {
    switch (tipo) {
      case 'despacho': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'decisao': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'peticao': return <Upload className="h-4 w-4 text-purple-600" />;
      case 'audiencia': return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'sentenca': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleClose = () => {
    setProcessList("");
    setProcessResults([]);
    setSearchCompleted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            PUSH - Atualização de Processos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: {clientName} | Busca automatizada no PJE (https://comunica.pje.jus.br/)
          </p>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Entrada de processos */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Lista de Processos (um por linha)
              </label>
              <Textarea
                placeholder="Digite os números dos processos, um por linha:&#10;0001234-56.2024.5.02.0001&#10;0001235-67.2024.5.02.0002&#10;..."
                value={processList}
                onChange={(e) => setProcessList(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
                disabled={isSearching}
              />
            </div>

            <Button
              onClick={handleProcessSearch}
              disabled={isSearching || !processList.trim()}
              className="w-full"
              variant="professional"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Buscando processos...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Atualizações no PJE
                </>
              )}
            </Button>
          </div>

          {/* Resultados */}
          {(processResults.length > 0 || isSearching) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Resultados da Busca</h3>
                {searchCompleted && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {processResults.length} processos encontrados
                  </Badge>
                )}
              </div>

              {isSearching && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Consultando processos no PJE...</p>
                </div>
              )}

              <div className="grid gap-4 max-h-[400px] overflow-y-auto">
                {processResults.map((processo) => (
                  <Card key={processo.numero} className="border border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-mono">
                            {processo.numero}
                          </CardTitle>
                          <CardDescription>{processo.descricao}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(processo.status)}>
                          {processo.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Tribunal:</span>
                            <p className="text-foreground">{processo.tribunal}</p>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-muted-foreground">Última movimentação:</span>
                            <p className="text-foreground">
                              {format(processo.ultimaMovimentacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground">Últimos andamentos:</span>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {processo.andamentos.slice(0, 3).map((andamento, index) => (
                              <div key={index} className="flex items-start gap-2 text-xs">
                                {getMovementIcon(andamento.tipo)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-foreground line-clamp-1">{andamento.descricao}</p>
                                  <p className="text-muted-foreground">
                                    {format(andamento.data, "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PJEProcessUpdater;