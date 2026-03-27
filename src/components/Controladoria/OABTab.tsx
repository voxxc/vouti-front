import { useState, useMemo, useEffect } from 'react';
import { 
  Eye, Bell, Loader2, FileText, ChevronLeft, ChevronRight,
  Link2, AlertCircle, Filter, Users, Trash2, Search, X, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProcessosOAB, ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

interface OABTabProps {
  oabId: string;
  oab?: OABCadastrada;
  onProcessoCompartilhadoAtualizado?: (cnj: string, oabsAfetadas: string[]) => void;
}

interface CompartilhadosMap {
  [cnj: string]: { advogadoNome: string; oabNumero: string }[];
}

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

export const OABTab = ({ oabId, oab, onProcessoCompartilhadoAtualizado }: OABTabProps) => {
  const { 
    processos, loading, carregandoDetalhes, fetchProcessos,
    carregarDetalhes, toggleMonitoramento, consultarDetalhesRequest,
    excluirProcesso, atualizarProcesso
  } = useProcessosOAB(oabId);
  
  const { tenantId } = useTenantId();
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (selectedProcesso) {
      const updated = processos.find(p => p.id === selectedProcesso.id);
      if (updated && updated !== selectedProcesso) setSelectedProcesso(updated);
    }
  }, [processos]);

  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [compartilhadosMap, setCompartilhadosMap] = useState<CompartilhadosMap>({});
  const [processoParaExcluir, setProcessoParaExcluir] = useState<ProcessoOAB | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // Fetch shared processes
  useEffect(() => {
    const fetchCompartilhados = async () => {
      if (!tenantId) return;
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`numero_cnj, oab_id, oabs_cadastradas!inner(oab_numero, nome_advogado)`)
        .eq('tenant_id', tenantId);
      if (error || !data) return;
      
      const cnjMap = new Map<string, { advogadoNome: string; oabNumero: string }[]>();
      data.forEach((p: any) => {
        const cnj = p.numero_cnj;
        const advInfo = { advogadoNome: p.oabs_cadastradas?.nome_advogado || '', oabNumero: p.oabs_cadastradas?.oab_numero || '' };
        if (!cnjMap.has(cnj)) cnjMap.set(cnj, []);
        const existing = cnjMap.get(cnj)!;
        if (!existing.some(e => e.oabNumero === advInfo.oabNumero)) existing.push(advInfo);
      });
      
      const compartilhados: CompartilhadosMap = {};
      cnjMap.forEach((advogados, cnj) => { if (advogados.length > 1) compartilhados[cnj] = advogados; });
      setCompartilhadosMap(compartilhados);
    };
    fetchCompartilhados();
  }, [tenantId, processos]);

  const compartilhadosCount = useMemo(() => processos.filter(p => compartilhadosMap[p.numero_cnj]).length, [processos, compartilhadosMap]);
  const naoLidosCount = useMemo(() => processos.filter(p => (p.andamentos_nao_lidos || 0) > 0).length, [processos]);
  const monitoradosCount = useMemo(() => processos.filter(p => p.monitoramento_ativo === true).length, [processos]);

  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processos.forEach(p => {
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries()).sort((a, b) => b[1] - a[1]).map(([uf, count]) => ({ uf, count }));
  }, [processos]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;
    if (filtroUF === 'compartilhados') resultado = resultado.filter(p => compartilhadosMap[p.numero_cnj]);
    else if (filtroUF === 'nao-lidos') resultado = resultado.filter(p => (p.andamentos_nao_lidos || 0) > 0);
    else if (filtroUF === 'monitorados') resultado = resultado.filter(p => p.monitoramento_ativo === true);
    else if (filtroUF !== 'todos') resultado = resultado.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
    
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase().trim();
      resultado = resultado.filter(p => 
        p.numero_cnj?.toLowerCase().includes(termo) ||
        p.parte_ativa?.toLowerCase().includes(termo) ||
        p.parte_passiva?.toLowerCase().includes(termo) ||
        p.tribunal_sigla?.toLowerCase().includes(termo)
      );
    }
    return resultado;
  }, [processos, filtroUF, compartilhadosMap, termoBusca]);

  useEffect(() => { setPage(0); }, [filtroUF, termoBusca]);

  const totalPages = Math.ceil(processosFiltrados.length / PAGE_SIZE);
  const processosPaginados = useMemo(() => {
    const from = page * PAGE_SIZE;
    return processosFiltrados.slice(from, from + PAGE_SIZE);
  }, [processosFiltrados, page]);

  const handleVerDetalhes = async (processo: ProcessoOAB) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
    if (processo.detalhes_request_id) {
      await consultarDetalhesRequest(processo.id, processo.detalhes_request_id);
    }
  };

  const handleToggleMonitoramento = async (processo: ProcessoOAB) => {
    return await toggleMonitoramento(processo.id, processo.numero_cnj, !processo.monitoramento_ativo, oabId, onProcessoCompartilhadoAtualizado);
  };

  const handleConfirmExcluir = async () => {
    if (!processoParaExcluir) return;
    setExcluindo(true);
    await excluirProcesso(processoParaExcluir.id, processoParaExcluir.numero_cnj);
    setExcluindo(false);
    setProcessoParaExcluir(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="h-full text-center py-8 border rounded-lg bg-muted/20">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum processo encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em "Sincronizar" para buscar processos desta OAB
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Filters */}
      <div className="flex-shrink-0 space-y-3">
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, processosFiltrados.length)} de {processosFiltrados.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        {(ufsDisponiveis.length > 1 || compartilhadosCount > 0 || naoLidosCount > 0) && (
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filtroUF} onValueChange={setFiltroUF}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos ({processos.length})</SelectItem>
                {naoLidosCount > 0 && (
                  <SelectItem value="nao-lidos">
                    <span className="flex items-center gap-2">
                      <Bell className="w-3 h-3 text-red-500" />
                      Com novos andamentos ({naoLidosCount})
                    </span>
                  </SelectItem>
                )}
                {compartilhadosCount > 0 && (
                  <SelectItem value="compartilhados">
                    <span className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-purple-500" />
                      Compartilhados ({compartilhadosCount})
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
                {ufsDisponiveis.map(({ uf, count }) => (
                  <SelectItem key={uf} value={uf}>{uf} - {count}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtroUF !== 'todos' && (
              <Badge variant="secondary">
                {processosFiltrados.length} {processosFiltrados.length === 1 ? 'processo' : 'processos'}
              </Badge>
            )}
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por CNJ, partes ou tribunal..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="pl-9 pr-9"
          />
          {termoBusca && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setTermoBusca('')}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {processosPaginados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum processo encontrado para esta busca</p>
              {termoBusca && (
                <Button variant="link" className="mt-2" onClick={() => setTermoBusca('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead className="text-center">Não Lidos</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processosPaginados.map(processo => {
                  const temRecursoVinculado = processo.capa_completa?.related_lawsuits?.length > 0;
                  const outrosAdvogados = (compartilhadosMap[processo.numero_cnj] || []).filter(
                    adv => adv.oabNumero !== oab?.oab_numero
                  );
                  const isCompartilhado = outrosAdvogados.length > 0;

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
                            {isCompartilhado && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-600 cursor-help">
                                    <Users className="w-2.5 h-2.5 mr-0.5" />
                                    Compartilhado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Com: {outrosAdvogados.map(a => a.advogadoNome || a.oabNumero).join(', ')}</p>
                                </TooltipContent>
                              </Tooltip>
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

      {/* Drawer */}
      <ProcessoOABDetalhes
        processo={selectedProcesso}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggleMonitoramento={handleToggleMonitoramento}
        onRefreshProcessos={fetchProcessos}
        onConsultarDetalhesRequest={consultarDetalhesRequest}
        onCarregarDetalhes={carregarDetalhes}
        onAtualizarProcesso={atualizarProcesso}
        oab={oab}
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
              {excluindo ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo...</>) : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
