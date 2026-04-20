import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Eye, Bell, Loader2, FileText, Search, X, Filter, ChevronLeft, ChevronRight, Trash2, Scale, Link2, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { useAllProcessosOAB, ProcessoOABComOAB } from '@/hooks/useAllProcessosOAB';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';
import { toast as sonnerToast } from 'sonner';

const TRIBUNAL_UF_MAP: Record<string, string> = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
  '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
  '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
  '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
  '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SE',
  '26': 'SP', '27': 'TO',
};

const extrairUF = (tribunalSigla: string | null | undefined, numeroCnj?: string | null): string => {
  if (tribunalSigla) {
    const matchTJ = tribunalSigla.match(/TJ([A-Z]{2})/);
    if (matchTJ) return matchTJ[1];
  }
  if (numeroCnj) {
    const match = numeroCnj.match(/\.\d{4}\.(\d)\.(\d{2})\./);
    if (match) {
      const segmento = match[1];
      const codigoTribunal = match[2];
      if (segmento === '8' && TRIBUNAL_UF_MAP[codigoTribunal]) return TRIBUNAL_UF_MAP[codigoTribunal];
      return `${segmento}.${codigoTribunal}`;
    }
  }
  return 'N/I';
};

export const GeralTab = () => {
  const {
    processos, loading, carregandoDetalhes, page, setPage, totalCount, pageSize,
    searchTerm, setSearchTerm, fetchProcessos, carregarDetalhes, toggleMonitoramento,
    consultarDetalhesRequest, excluirProcesso, atualizarProcesso
  } = useAllProcessosOAB();

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOABComOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (selectedProcesso) {
      const updated = processos.find(p => p.id === selectedProcesso.id);
      if (updated && updated !== selectedProcesso) setSelectedProcesso(updated);
    }
  }, [processos]);

  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [processoParaExcluir, setProcessoParaExcluir] = useState<ProcessoOABComOAB | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [inputBusca, setInputBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setInputBusca(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(0);
    }, 400);
  }, [setSearchTerm, setPage]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => { setPage(0); }, [filtroUF, setPage]);

  // Reset selection on filter/page/search changes
  useEffect(() => { setSelectedIds(new Set()); }, [filtroUF, page, searchTerm]);

  const naoLidosCount = useMemo(() => processos.filter(p => (p.andamentos_nao_lidos || 0) > 0).length, [processos]);
  const monitoradosCount = useMemo(() => processos.filter(p => p.monitoramento_ativo).length, [processos]);

  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processos.forEach(p => {
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries()).sort((a, b) => b[1] - a[1]).map(([uf, count]) => ({ uf, count }));
  }, [processos]);

  const oabsDisponiveis = useMemo(() => {
    const oabMap = new Map<string, number>();
    processos.forEach(p => {
      const key = `${p.oab_numero}/${p.oab_uf}`;
      oabMap.set(key, (oabMap.get(key) || 0) + 1);
    });
    return Array.from(oabMap.entries()).sort((a, b) => b[1] - a[1]).map(([oab, count]) => ({ oab, count }));
  }, [processos]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;
    if (filtroUF === 'nao-lidos') {
      resultado = resultado.filter(p => (p.andamentos_nao_lidos || 0) > 0)
        .sort((a, b) => {
          const dateA = a.ultima_movimentacao ? new Date(a.ultima_movimentacao).getTime() : 0;
          const dateB = b.ultima_movimentacao ? new Date(b.ultima_movimentacao).getTime() : 0;
          return dateB - dateA;
        });
    } else if (filtroUF === 'monitorados') {
      resultado = resultado.filter(p => p.monitoramento_ativo);
    } else if (filtroUF.startsWith('oab:')) {
      const oabKey = filtroUF.replace('oab:', '');
      resultado = resultado.filter(p => `${p.oab_numero}/${p.oab_uf}` === oabKey);
    } else if (filtroUF !== 'todos') {
      resultado = resultado.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
    }
    return resultado;
  }, [processos, filtroUF]);

  const handleVerDetalhes = async (processo: ProcessoOABComOAB) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
    if (processo.detalhes_request_id) {
      await consultarDetalhesRequest(processo.id, processo.detalhes_request_id);
    }
  };

  const handleToggleMonitoramento = async (processo: ProcessoOAB) => {
    const p = processo as ProcessoOABComOAB;
    return await toggleMonitoramento(p.id, p.numero_cnj, !p.monitoramento_ativo, p.oab_id);
  };

  const handleConfirmExcluir = async () => {
    if (!processoParaExcluir) return;
    setExcluindo(true);
    await excluirProcesso(processoParaExcluir.id, processoParaExcluir.numero_cnj);
    setExcluindo(false);
    setProcessoParaExcluir(null);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = processosFiltrados.length > 0 && processosFiltrados.every(p => selectedIds.has(p.id));
  const someVisibleSelected = processosFiltrados.some(p => selectedIds.has(p.id));

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        processosFiltrados.forEach(p => next.delete(p.id));
      } else {
        processosFiltrados.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const selectedProcessos = useMemo(
    () => processosFiltrados.filter(p => selectedIds.has(p.id)),
    [processosFiltrados, selectedIds]
  );

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setBulkProgress({ done: 0, total: ids.length });

    const idToCnj = new Map(processos.map(p => [p.id, p.numero_cnj]));
    let sucessos = 0;
    let pulados = 0;
    let erros = 0;

    const CHUNK = 5;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const results = await Promise.all(
        chunk.map(async (id) => {
          const proc = processos.find(p => p.id === id);
          if (proc?.monitoramento_ativo) return 'pulado';
          try {
            const ok = await excluirProcesso(id, idToCnj.get(id) || '');
            return ok ? 'sucesso' : 'pulado';
          } catch {
            return 'erro';
          }
        })
      );
      results.forEach(r => {
        if (r === 'sucesso') sucessos++;
        else if (r === 'pulado') pulados++;
        else erros++;
      });
      setBulkProgress({ done: Math.min(i + CHUNK, ids.length), total: ids.length });
    }

    setBulkDeleting(false);
    setBulkProgress(null);
    setBulkDialogOpen(false);
    setSelectedIds(new Set());

    const msg = [
      `${sucessos} excluído(s)`,
      pulados > 0 ? `${pulados} pulado(s) (monitorados)` : null,
      erros > 0 ? `${erros} falharam` : null,
    ].filter(Boolean).join(', ');
    sonnerToast.success(msg || 'Nenhuma alteração');
    fetchProcessos();
  };

  const handlePrevPage = () => { if (page > 0) setPage(page - 1); };
  const handleNextPage = () => { if (page < totalPages - 1) setPage(page + 1); };

  const selectedOAB: OABCadastrada | undefined = selectedProcesso?.oab_data;

  if (loading && processos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loading && processos.length === 0 && page === 0 && !searchTerm) {
    return (
      <div className="h-full text-center py-8 border rounded-lg bg-muted/20">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum processo encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre e sincronize OABs na aba "OABs" para ver processos aqui
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Filters */}
      <div className="flex-shrink-0 space-y-3">
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevPage} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Página {page + 1} de {totalPages} ({totalCount} processos)</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextPage} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filtroUF} onValueChange={setFiltroUF}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ({totalCount})</SelectItem>
              {naoLidosCount > 0 && (
                <SelectItem value="nao-lidos">
                  <span className="flex items-center gap-2">
                    <Bell className="w-3 h-3 text-red-500" />
                    Com novos andamentos ({naoLidosCount})
                  </span>
                </SelectItem>
              )}
              {monitoradosCount > 0 && (
                <SelectItem value="monitorados">
                  <span className="flex items-center gap-2">
                    <Bell className="w-3 h-3 text-green-500" />
                    Monitorados ({monitoradosCount})
                  </span>
                </SelectItem>
              )}
              {oabsDisponiveis.length > 1 && oabsDisponiveis.map(({ oab, count }) => (
                <SelectItem key={oab} value={`oab:${oab}`}>
                  OAB {oab} ({count})
                </SelectItem>
              ))}
              {ufsDisponiveis.map(({ uf, count }) => (
                <SelectItem key={uf} value={uf}>
                  {uf} - {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtroUF !== 'todos' && (
            <Badge variant="secondary">
              {processosFiltrados.length} {processosFiltrados.length === 1 ? 'processo' : 'processos'}
            </Badge>
          )}

          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por CNJ, partes ou tribunal..."
            value={inputBusca}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {inputBusca && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => handleSearchChange('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-muted/40">
            <div className="text-sm">
              <strong>{selectedIds.size}</strong> processo(s) selecionado(s)
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir selecionados
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {processosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum processo encontrado para esta busca</p>
              {inputBusca && (
                <Button variant="link" className="mt-2" onClick={() => handleSearchChange('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                      onCheckedChange={() => toggleAll()}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Advogado (OAB)</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead className="text-center">Não Lidos</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processosFiltrados.map(processo => {
                  const temRecursoVinculado = processo.capa_completa?.related_lawsuits?.length > 0;
                  return (
                    <TableRow
                      key={processo.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleVerDetalhes(processo)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm">{processo.numero_cnj}</span>
                          <div className="flex flex-wrap gap-1">
                            {processo.monitoramento_ativo && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">
                                <Bell className="w-2.5 h-2.5 mr-0.5" />
                                Monitorado
                              </Badge>
                            )}
                            {temRecursoVinculado && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-600">
                                <Link2 className="w-2.5 h-2.5 mr-0.5" />
                                {processo.capa_completa.related_lawsuits.length} recurso(s)
                              </Badge>
                            )}
                          </div>
                        </div>
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
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="text-sm">
                            {processo.oab_numero}/{processo.oab_uf}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {processo.tribunal_sigla ? (
                          <Badge variant="outline">{processo.tribunal_sigla}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(processo.andamentos_nao_lidos || 0) > 0 ? (
                          <Badge variant="destructive" className="font-mono">
                            {processo.andamentos_nao_lidos}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleVerDetalhes(processo); }}
                            title="Ver detalhes"
                          >
                            {carregandoDetalhes === processo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setProcessoParaExcluir(processo); }}
                            title="Excluir processo"
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <ProcessoOABDetalhes
        processo={selectedProcesso}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggleMonitoramento={handleToggleMonitoramento}
        onRefreshProcessos={fetchProcessos}
        onConsultarDetalhesRequest={consultarDetalhesRequest}
        onCarregarDetalhes={carregarDetalhes}
        onAtualizarProcesso={atualizarProcesso}
        oab={selectedOAB}
      />

      {/* Delete dialog */}
      <AlertDialog open={!!processoParaExcluir} onOpenChange={(open) => !open && setProcessoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo <strong className="font-mono">{processoParaExcluir?.numero_cnj}</strong>?
              <br /><br />
              Esta ação irá remover o processo e todos os seus andamentos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExcluir}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo...</>
              ) : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
