import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Search, Scale, Eye, CheckCheck, AlertCircle } from "lucide-react";
import { useAndamentosNaoLidosGlobal, ProcessoComNaoLidos } from "@/hooks/useAndamentosNaoLidosGlobal";
import { ProcessoOABDetalhes } from "@/components/Controladoria/ProcessoOABDetalhes";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const CentralAndamentosNaoLidos = () => {
  const { processos, loading, oabs, totalNaoLidos, marcarTodosComoLidos, refetch } = useAndamentosNaoLidosGlobal();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOabId, setFilterOabId] = useState<string>("all");
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoComNaoLidos | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  const filteredProcessos = processos.filter(p => {
    const matchesSearch = 
      p.numero_cnj.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.parte_ativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.parte_passiva?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOab = filterOabId === "all" || p.oab_id === filterOabId;
    
    return matchesSearch && matchesOab;
  });

  const handleMarcarComoLidos = async (processoId: string) => {
    setIsMarking(true);
    try {
      const { error } = await marcarTodosComoLidos(processoId);
      if (error) {
        toast.error("Erro ao marcar andamentos como lidos");
      } else {
        toast.success("Todos os andamentos foram marcados como lidos");
      }
    } finally {
      setIsMarking(false);
      setConfirmMarkAll(null);
    }
  };

  const handleProcessoAtualizado = () => {
    refetch();
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Andamentos Não Lidos
            {totalNaoLidos > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalNaoLidos}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Processos com movimentações pendentes de leitura em todas as OABs
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 flex-shrink-0">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, partes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterOabId} onValueChange={setFilterOabId}>
          <SelectTrigger className="w-[280px]">
            <Scale className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por OAB" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as OABs</SelectItem>
            {oabs.map(oab => (
              <SelectItem key={oab.id} value={oab.id}>{oab.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredProcessos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum processo com andamentos não lidos</p>
              <p className="text-sm mt-1">Todos os andamentos foram lidos!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Advogado (OAB)</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead className="text-center">Não Lidos</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessos.map(processo => (
                  <TableRow 
                    key={processo.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProcesso(processo)}
                  >
                    <TableCell>
                      <div className="font-mono text-sm">{processo.numero_cnj}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {processo.parte_ativa && (
                          <div className="text-sm truncate" title={processo.parte_ativa}>
                            {processo.parte_ativa}
                          </div>
                        )}
                        {processo.parte_passiva && (
                          <div className="text-xs text-muted-foreground truncate" title={processo.parte_passiva}>
                            vs {processo.parte_passiva}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {processo.oab && (
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">{processo.oab.nome_advogado || 'Advogado'}</div>
                            <div className="text-xs text-muted-foreground">
                              {processo.oab.oab_numero}/{processo.oab.oab_uf}
                            </div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {processo.tribunal_sigla ? (
                        <Badge variant="outline">{processo.tribunal_sigla}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="destructive" 
                        className="font-mono"
                      >
                        {processo.andamentos_nao_lidos}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcesso(processo);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMarkAll(processo.id);
                          }}
                          title="Marcar todos como lidos"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <AlertDialog open={!!confirmMarkAll} onOpenChange={(open) => !open && setConfirmMarkAll(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Marcar todos como lidos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os andamentos não lidos deste processo serão marcados como lidos. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMarkAll && handleMarcarComoLidos(confirmMarkAll)}
              disabled={isMarking}
            >
              {isMarking ? "Marcando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drawer de detalhes do processo */}
      {selectedProcesso && (
        <ProcessoOABDetalhes
          processo={{
            id: selectedProcesso.id,
            numero_cnj: selectedProcesso.numero_cnj,
            parte_ativa: selectedProcesso.parte_ativa,
            parte_passiva: selectedProcesso.parte_passiva,
            tribunal_sigla: selectedProcesso.tribunal_sigla,
            monitoramento_ativo: selectedProcesso.monitoramento_ativo,
            oab_id: selectedProcesso.oab_id,
            capa_completa: selectedProcesso.capa_completa,
            andamentos_nao_lidos: selectedProcesso.andamentos_nao_lidos,
            created_at: '',
            ordem_lista: 0,
            tribunal: null,
            partes_completas: null,
            status_processual: null,
            fase_processual: null,
            data_distribuicao: null,
            valor_causa: null,
            juizo: null,
            link_tribunal: null,
            detalhes_completos: null,
            detalhes_carregados: false,
            detalhes_request_id: null,
            detalhes_request_data: null,
            tracking_id: null,
            ultima_atualizacao_detalhes: null,
          }}
          open={!!selectedProcesso}
          onOpenChange={(open) => !open && setSelectedProcesso(null)}
          onToggleMonitoramento={async () => {}}
          onRefreshProcessos={async () => { await handleProcessoAtualizado(); }}
        />
      )}
    </div>
  );
};
