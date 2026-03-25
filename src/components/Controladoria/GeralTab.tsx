import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Eye, Bell, Loader2, FileText, BookOpen, BookUp, FileQuestion,
  ChevronDown, Link2, Trash2, Search, X, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProcessoOAB, OABCadastrada } from '@/hooks/useOABs';
import { useAllProcessosOAB, ProcessoOABComOAB } from '@/hooks/useAllProcessosOAB';
import { ProcessoOABDetalhes } from './ProcessoOABDetalhes';

// UF extraction from CNJ
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

interface ProcessosAgrupados {
  primeiraInstancia: ProcessoOABComOAB[];
  segundaInstancia: ProcessoOABComOAB[];
  semInstancia: ProcessoOABComOAB[];
}

const agruparPorInstancia = (processos: ProcessoOABComOAB[]): ProcessosAgrupados => {
  const primeiraInstancia: ProcessoOABComOAB[] = [];
  const segundaInstancia: ProcessoOABComOAB[] = [];
  const semInstancia: ProcessoOABComOAB[] = [];

  processos.forEach(processo => {
    const instance = processo.capa_completa?.instance;
    if (instance === 1) primeiraInstancia.push(processo);
    else if (instance === 2) segundaInstancia.push(processo);
    else semInstancia.push(processo);
  });

  return { primeiraInstancia, segundaInstancia, semInstancia };
};

// Minimalist pagination controls
const PaginationControls = ({
  page,
  totalPages,
  totalCount,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) => {
  if (totalPages <= 1 && totalCount <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onPrev}
        disabled={page === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span>
        Página {page + 1} de {totalPages || 1} ({totalCount} processos)
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onNext}
        disabled={page >= totalPages - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Card component for Geral tab
const GeralProcessoCard = ({
  processo,
  onVerDetalhes,
  onExcluir,
  carregandoDetalhes,
}: {
  processo: ProcessoOABComOAB;
  onVerDetalhes: (p: ProcessoOABComOAB) => void;
  onExcluir: (p: ProcessoOABComOAB) => void;
  carregandoDetalhes: string | null;
}) => {
  const temRecursoVinculado = processo.capa_completa?.related_lawsuits?.length > 0;
  const processosRelacionados = processo.capa_completa?.related_lawsuits || [];

  return (
    <Card className="p-4 md:p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Linha 1: CNJ */}
        <div className="flex items-start justify-between">
          <span className="font-mono text-base md:text-lg font-semibold">
            {processo.numero_cnj}
          </span>
        </div>

        {/* Linha 2: Badges */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            {processo.oab_numero}/{processo.oab_uf}
          </Badge>
          {processo.monitoramento_ativo && (
            <Badge variant="default" className="text-xs bg-green-600">
              <Bell className="w-3 h-3 mr-1" />
              Monitorado
            </Badge>
          )}
          {(processo.andamentos_nao_lidos || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              {processo.andamentos_nao_lidos} novos
            </Badge>
          )}
          {temRecursoVinculado && (
            <Badge variant="outline" className="text-xs border-purple-500 text-purple-600">
              <Link2 className="w-3 h-3 mr-1" />
              {processosRelacionados.length} recurso(s)
            </Badge>
          )}
        </div>

        {/* Linha 3: Partes */}
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-sm text-muted-foreground truncate cursor-default">
              {processo.parte_ativa || 'Autor não identificado'}
              {' vs '}
              {processo.parte_passiva || 'Réu não identificado'}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>{processo.parte_ativa || 'Autor não identificado'} vs {processo.parte_passiva || 'Réu não identificado'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Linha 4: Tribunal + Actions */}
        <div className="flex items-center justify-between mt-1">
          <div>
            {processo.tribunal_sigla && (
              <Badge variant="outline" className="text-xs">
                {processo.tribunal_sigla}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onExcluir(processo)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir processo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => onVerDetalhes(processo)}
                  disabled={carregandoDetalhes === processo.id}
                >
                  {carregandoDetalhes === processo.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  );
};

const GeralInstanciaSection = ({
  titulo,
  processos,
  corBorder,
  corText,
  icon,
  onVerDetalhes,
  onExcluir,
  carregandoDetalhes,
}: {
  titulo: string;
  processos: ProcessoOABComOAB[];
  corBorder: string;
  corText: string;
  icon: React.ReactNode;
  onVerDetalhes: (p: ProcessoOABComOAB) => void;
  onExcluir: (p: ProcessoOABComOAB) => void;
  carregandoDetalhes: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  if (processos.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 py-2 hover:opacity-80 transition-opacity">
          <span className={corText}>{icon}</span>
          <span className={`font-semibold ${corText}`}>{titulo}</span>
          <Badge variant="secondary" className="ml-auto mr-2">
            {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`space-y-2 pl-3 border-l-2 ${corBorder} ml-2`}>
          {processos.map((processo) => (
            <GeralProcessoCard
              key={processo.id}
              processo={processo}
              onVerDetalhes={onVerDetalhes}
              onExcluir={onExcluir}
              carregandoDetalhes={carregandoDetalhes}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const GeralTab = () => {
  const {
    processos,
    loading,
    carregandoDetalhes,
    page,
    setPage,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    fetchProcessos,
    carregarDetalhes,
    toggleMonitoramento,
    consultarDetalhesRequest,
    excluirProcesso,
    atualizarProcesso
  } = useAllProcessosOAB();

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOABComOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sync selectedProcesso with updated list after refetch
  useEffect(() => {
    if (selectedProcesso) {
      const updated = processos.find(p => p.id === selectedProcesso.id);
      if (updated && updated !== selectedProcesso) {
        setSelectedProcesso(updated);
      }
    }
  }, [processos]);
  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [processoParaExcluir, setProcessoParaExcluir] = useState<ProcessoOABComOAB | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [inputBusca, setInputBusca] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setInputBusca(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPage(0);
    }, 400);
  }, [setSearchTerm, setPage]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filtroUF, setPage]);

  const naoLidosCount = useMemo(() => processos.filter(p => (p.andamentos_nao_lidos || 0) > 0).length, [processos]);
  const monitoradosCount = useMemo(() => processos.filter(p => p.monitoramento_ativo).length, [processos]);

  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processos.forEach(p => {
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([uf, count]) => ({ uf, count }));
  }, [processos]);

  const oabsDisponiveis = useMemo(() => {
    const oabMap = new Map<string, number>();
    processos.forEach(p => {
      const key = `${p.oab_numero}/${p.oab_uf}`;
      oabMap.set(key, (oabMap.get(key) || 0) + 1);
    });
    return Array.from(oabMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([oab, count]) => ({ oab, count }));
  }, [processos]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;

    if (filtroUF === 'nao-lidos') {
      resultado = resultado
        .filter(p => (p.andamentos_nao_lidos || 0) > 0)
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

  const processosAgrupados = useMemo(() => agruparPorInstancia(processosFiltrados), [processosFiltrados]);

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
      {/* Top pagination */}
      <div className="flex-shrink-0">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 space-y-3">
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

          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
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
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => { handleSearchChange(''); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Process list */}
      <div className="flex-1 overflow-y-auto pr-4" style={{ minHeight: '300px' }}>
        <div className="space-y-4">
          <GeralInstanciaSection
            titulo="1ª Instância"
            processos={processosAgrupados.primeiraInstancia}
            corBorder="border-blue-200 dark:border-blue-800"
            corText="text-blue-700 dark:text-blue-300"
            icon={<BookOpen className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            onExcluir={setProcessoParaExcluir}
            carregandoDetalhes={carregandoDetalhes}
          />

          <GeralInstanciaSection
            titulo="2ª Instância"
            processos={processosAgrupados.segundaInstancia}
            corBorder="border-green-200 dark:border-green-800"
            corText="text-green-700 dark:text-green-300"
            icon={<BookUp className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            onExcluir={setProcessoParaExcluir}
            carregandoDetalhes={carregandoDetalhes}
          />

          {processosAgrupados.semInstancia.length > 0 && (
            <GeralInstanciaSection
              titulo="Instância não identificada"
              processos={processosAgrupados.semInstancia}
              corBorder="border-muted-foreground/20"
              corText="text-muted-foreground"
              icon={<FileQuestion className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
              onExcluir={setProcessoParaExcluir}
              carregandoDetalhes={carregandoDetalhes}
            />
          )}

          {!loading && processosFiltrados.length === 0 && (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <Search className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum processo encontrado para esta busca</p>
              {inputBusca && (
                <Button variant="link" className="mt-2" onClick={() => handleSearchChange('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </div>
      </div>


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
