import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Eye, 
  Bell, 
  Loader2,
  FileText,
  BookOpen,
  BookUp,
  FileQuestion,
  ChevronDown,
  Link2,
  AlertTriangle,
  Filter,
  Users,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
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

// Mapa de CNJ -> advogados que compartilham
interface CompartilhadosMap {
  [cnj: string]: { advogadoNome: string; oabNumero: string }[];
}

interface ProcessosAgrupados {
  primeiraInstancia: ProcessoOAB[];
  segundaInstancia: ProcessoOAB[];
  semInstancia: ProcessoOAB[];
}

// Mapa de codigos de tribunal CNJ para UF
const TRIBUNAL_UF_MAP: Record<string, string> = {
  '01': 'AC', '02': 'AL', '03': 'AP', '04': 'AM', '05': 'BA',
  '06': 'CE', '07': 'DF', '08': 'ES', '09': 'GO', '10': 'MA',
  '11': 'MT', '12': 'MS', '13': 'MG', '14': 'PA', '15': 'PB',
  '16': 'PR', '17': 'PE', '18': 'PI', '19': 'RJ', '20': 'RN',
  '21': 'RS', '22': 'RO', '23': 'RR', '24': 'SC', '25': 'SE',
  '26': 'SP', '27': 'TO',
};

const extrairUF = (tribunalSigla: string | null | undefined, numeroCnj?: string | null): string => {
  // Primeiro tenta pelo tribunal_sigla
  if (tribunalSigla) {
    const matchTJ = tribunalSigla.match(/TJ([A-Z]{2})/);
    if (matchTJ) return matchTJ[1];
  }
  
  // Fallback: extrai do numero CNJ (formato: NNNNNNN-DD.AAAA.J.TR.OOOO)
  if (numeroCnj) {
    const match = numeroCnj.match(/\.\d{4}\.(\d)\.(\d{2})\./);
    if (match) {
      const segmento = match[1]; // 8 = Justica Estadual
      const codigoTribunal = match[2];
      
      if (segmento === '8' && TRIBUNAL_UF_MAP[codigoTribunal]) {
        return TRIBUNAL_UF_MAP[codigoTribunal];
      }
      
      // Para outros segmentos (TRF, TRT, etc), retorna codigo
      return `${segmento}.${codigoTribunal}`;
    }
  }
  
  return 'N/I';
};

const agruparPorInstancia = (processos: ProcessoOAB[]): ProcessosAgrupados => {
  const primeiraInstancia: ProcessoOAB[] = [];
  const segundaInstancia: ProcessoOAB[] = [];
  const semInstancia: ProcessoOAB[] = [];
  
  processos.forEach(processo => {
    const instance = processo.capa_completa?.instance;
    if (instance === 1) {
      primeiraInstancia.push(processo);
    } else if (instance === 2) {
      segundaInstancia.push(processo);
    } else {
      semInstancia.push(processo);
    }
  });
  
  return { primeiraInstancia, segundaInstancia, semInstancia };
};

interface ProcessoCardProps {
  processo: ProcessoOAB;
  index: number;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  onExcluir: (processo: ProcessoOAB) => void;
  carregandoDetalhes: string | null;
  compartilhadoCom?: { advogadoNome: string; oabNumero: string }[];
  oabAtualNumero?: string;
  temIntimacaoUrgente?: boolean;
}

const ProcessoCard = ({ 
  processo, 
  index, 
  onVerDetalhes, 
  onExcluir,
  carregandoDetalhes,
  compartilhadoCom,
  oabAtualNumero,
  temIntimacaoUrgente
}: ProcessoCardProps) => {
  const temRecursoVinculado = processo.capa_completa?.related_lawsuits?.length > 0;
  const processosRelacionados = processo.capa_completa?.related_lawsuits || [];
  
  // Filtrar a OAB atual da lista de compartilhados
  const outrosAdvogados = compartilhadoCom?.filter(
    adv => adv.oabNumero !== oabAtualNumero
  ) || [];
  const isCompartilhado = outrosAdvogados.length > 0;

  return (
    <Draggable 
      key={processo.id} 
      draggableId={processo.id} 
      index={index}
    >
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`p-3 transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...provided.dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Processo Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-sm font-medium truncate">
                  {processo.numero_cnj}
                </span>
                {isCompartilhado && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <Users className="w-4 h-4 text-purple-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Compartilhado com: {outrosAdvogados.map(a => a.advogadoNome || a.oabNumero).join(', ')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
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
                {temIntimacaoUrgente && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="text-xs animate-pulse gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Intimacao
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Este processo tem intimacoes urgentes pendentes</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {temRecursoVinculado && (
                  <Badge variant="outline" className="text-xs border-purple-500 text-purple-600">
                    <Link2 className="w-3 h-3 mr-1" />
                    {processosRelacionados.length} recurso(s)
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {processo.parte_ativa || 'Autor nao identificado'} 
                {' vs '}
                {processo.parte_passiva || 'Reu nao identificado'}
              </p>
              {processo.tribunal_sigla && (
                <Badge variant="outline" className="text-xs mt-1">
                  {processo.tribunal_sigla}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVerDetalhes(processo)}
                disabled={carregandoDetalhes === processo.id}
              >
                {carregandoDetalhes === processo.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Detalhes
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </Draggable>
  );
};

interface InstanciaSectionProps {
  titulo: string;
  processos: ProcessoOAB[];
  droppableId: string;
  corBg: string;
  corBorder: string;
  corText: string;
  icon: React.ReactNode;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  onExcluir: (processo: ProcessoOAB) => void;
  carregandoDetalhes: string | null;
  compartilhadosMap: CompartilhadosMap;
  oabAtualNumero?: string;
}

const InstanciaSection = ({ 
  titulo, 
  processos, 
  droppableId,
  corBg, 
  corBorder,
  corText,
  icon, 
  onVerDetalhes,
  onExcluir,
  carregandoDetalhes,
  compartilhadosMap,
  oabAtualNumero
}: InstanciaSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (processos.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button 
          className={`w-full flex items-center gap-2 p-3 rounded-lg border ${corBg} ${corBorder} hover:opacity-90 transition-opacity`}
        >
          <span className={corText}>{icon}</span>
          <span className={`font-semibold ${corText}`}>{titulo}</span>
          <Badge variant="secondary" className="ml-auto mr-2">
            {processos.length} {processos.length === 1 ? 'processo' : 'processos'}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-2 pl-3 border-l-2 ${corBorder} ml-2`}
            >
              {processos.map((processo, index) => (
                <ProcessoCard 
                  key={processo.id}
                  processo={processo}
                  index={index}
                  onVerDetalhes={onVerDetalhes}
                  onExcluir={onExcluir}
                  carregandoDetalhes={carregandoDetalhes}
                  compartilhadoCom={compartilhadosMap[processo.numero_cnj]}
                  oabAtualNumero={oabAtualNumero}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const OABTab = ({ oabId, oab, onProcessoCompartilhadoAtualizado }: OABTabProps) => {
  const { 
    processos, 
    loading, 
    carregandoDetalhes,
    fetchProcessos,
    carregarDetalhes, 
    atualizarOrdem,
    toggleMonitoramento,
    consultarDetalhesRequest,
    excluirProcesso,
    atualizarProcesso
  } = useProcessosOAB(oabId);
  
  const { tenantId } = useTenantId();
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [compartilhadosMap, setCompartilhadosMap] = useState<CompartilhadosMap>({});
  const [processoParaExcluir, setProcessoParaExcluir] = useState<ProcessoOAB | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Buscar processos compartilhados (CNJs que aparecem em multiplas OABs)
  useEffect(() => {
    const fetchCompartilhados = async () => {
      if (!tenantId) return;
      
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          numero_cnj,
          oab_id,
          oabs_cadastradas!inner(oab_numero, nome_advogado)
        `)
        .eq('tenant_id', tenantId);
      
      if (error || !data) return;
      
      // Agrupar por CNJ e contar quantas OABs diferentes tem cada processo
      const cnjMap = new Map<string, { advogadoNome: string; oabNumero: string }[]>();
      
      data.forEach((p: any) => {
        const cnj = p.numero_cnj;
        const advInfo = {
          advogadoNome: p.oabs_cadastradas?.nome_advogado || '',
          oabNumero: p.oabs_cadastradas?.oab_numero || ''
        };
        
        if (!cnjMap.has(cnj)) {
          cnjMap.set(cnj, []);
        }
        
        // Evitar duplicatas da mesma OAB
        const existing = cnjMap.get(cnj)!;
        if (!existing.some(e => e.oabNumero === advInfo.oabNumero)) {
          existing.push(advInfo);
        }
      });
      
      // Filtrar apenas CNJs com mais de 1 OAB
      const compartilhados: CompartilhadosMap = {};
      cnjMap.forEach((advogados, cnj) => {
        if (advogados.length > 1) {
          compartilhados[cnj] = advogados;
        }
      });
      
      setCompartilhadosMap(compartilhados);
    };
    
    fetchCompartilhados();
  }, [tenantId, processos]);

  // Contagem de compartilhados para o filtro
  const compartilhadosCount = useMemo(() => {
    return processos.filter(p => compartilhadosMap[p.numero_cnj]).length;
  }, [processos, compartilhadosMap]);

  // Contagem de processos com andamentos nao lidos
  const naoLidosCount = useMemo(() => {
    return processos.filter(p => (p.andamentos_nao_lidos || 0) > 0).length;
  }, [processos]);

  // Extrair UFs unicas dos processos com contagem
  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processos.forEach(p => {
      const uf = extrairUF(p.tribunal_sigla, p.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries())
      .sort((a, b) => b[1] - a[1]) // Ordenar por quantidade desc
      .map(([uf, count]) => ({ uf, count }));
  }, [processos]);

  // Aplicar filtro antes do agrupamento
  const processosFiltrados = useMemo(() => {
    if (filtroUF === 'todos') return processos;
    if (filtroUF === 'compartilhados') {
      return processos.filter(p => compartilhadosMap[p.numero_cnj]);
    }
    if (filtroUF === 'nao-lidos') {
      return processos.filter(p => (p.andamentos_nao_lidos || 0) > 0);
    }
    return processos.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
  }, [processos, filtroUF, compartilhadosMap]);

  const processosAgrupados = useMemo(() => agruparPorInstancia(processosFiltrados), [processosFiltrados]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    
    // Apenas permitir reordenacao dentro da mesma secao
    if (sourceId !== destId) return;

    // Determinar qual lista foi afetada
    let listaAfetada: ProcessoOAB[];
    if (sourceId === 'primeira-instancia') {
      listaAfetada = [...processosAgrupados.primeiraInstancia];
    } else if (sourceId === 'segunda-instancia') {
      listaAfetada = [...processosAgrupados.segundaInstancia];
    } else {
      listaAfetada = [...processosAgrupados.semInstancia];
    }

    // Reordenar dentro da lista
    const [reorderedItem] = listaAfetada.splice(result.source.index, 1);
    listaAfetada.splice(result.destination.index, 0, reorderedItem);

    // Reconstruir a lista completa mantendo a ordem das outras secoes
    const novaOrdem: ProcessoOAB[] = [];
    
    if (sourceId === 'primeira-instancia') {
      novaOrdem.push(...listaAfetada);
      novaOrdem.push(...processosAgrupados.segundaInstancia);
      novaOrdem.push(...processosAgrupados.semInstancia);
    } else if (sourceId === 'segunda-instancia') {
      novaOrdem.push(...processosAgrupados.primeiraInstancia);
      novaOrdem.push(...listaAfetada);
      novaOrdem.push(...processosAgrupados.semInstancia);
    } else {
      novaOrdem.push(...processosAgrupados.primeiraInstancia);
      novaOrdem.push(...processosAgrupados.segundaInstancia);
      novaOrdem.push(...listaAfetada);
    }

    atualizarOrdem(novaOrdem);
  };

  const handleVerDetalhes = async (processo: ProcessoOAB) => {
    // Sempre abre o drawer diretamente
    setSelectedProcesso(processo);
    setDrawerOpen(true);
    
    // Se tem request_id salvo, faz GET gratuito em background
    if (processo.detalhes_request_id) {
      await consultarDetalhesRequest(processo.id, processo.detalhes_request_id);
    }
    // Se NAO tem request_id, nao faz nada - usuario vera botao na aba Andamentos
  };

  const handleToggleMonitoramento = async (processo: ProcessoOAB) => {
    const result = await toggleMonitoramento(
      processo.id, 
      processo.numero_cnj, 
      !processo.monitoramento_ativo, 
      oabId,
      onProcessoCompartilhadoAtualizado
    );
    return result;
  };

  const handleExcluirClick = (processo: ProcessoOAB) => {
    setProcessoParaExcluir(processo);
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/20">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum processo encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em "Sincronizar" para buscar processos desta OAB
        </p>
      </div>
    );
  }

  const temProcessosAgrupados = 
    processosAgrupados.primeiraInstancia.length > 0 || 
    processosAgrupados.segundaInstancia.length > 0;

  return (
    <>
      {/* Filtro por UF */}
      {(ufsDisponiveis.length > 1 || compartilhadosCount > 0 || naoLidosCount > 0) && (
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filtroUF} onValueChange={setFiltroUF}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">
                Todos ({processos.length})
              </SelectItem>
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
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* 1a Instancia */}
          <InstanciaSection
            titulo="1a Instancia"
            processos={processosAgrupados.primeiraInstancia}
            droppableId="primeira-instancia"
            corBg="bg-blue-50 dark:bg-blue-950/30"
            corBorder="border-blue-200 dark:border-blue-800"
            corText="text-blue-700 dark:text-blue-300"
            icon={<BookOpen className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            onExcluir={handleExcluirClick}
            carregandoDetalhes={carregandoDetalhes}
            compartilhadosMap={compartilhadosMap}
            oabAtualNumero={oab?.oab_numero}
          />

          {/* 2a Instancia */}
          <InstanciaSection
            titulo="2a Instancia"
            processos={processosAgrupados.segundaInstancia}
            droppableId="segunda-instancia"
            corBg="bg-green-50 dark:bg-green-950/30"
            corBorder="border-green-200 dark:border-green-800"
            corText="text-green-700 dark:text-green-300"
            icon={<BookUp className="w-5 h-5" />}
            onVerDetalhes={handleVerDetalhes}
            onExcluir={handleExcluirClick}
            carregandoDetalhes={carregandoDetalhes}
            compartilhadosMap={compartilhadosMap}
            oabAtualNumero={oab?.oab_numero}
          />

          {/* Processos sem instancia identificada */}
          {processosAgrupados.semInstancia.length > 0 && (
            <InstanciaSection
              titulo="Instancia nao identificada"
              processos={processosAgrupados.semInstancia}
              droppableId="sem-instancia"
              corBg="bg-muted/50"
              corBorder="border-muted-foreground/20"
              corText="text-muted-foreground"
              icon={<FileQuestion className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
              onExcluir={handleExcluirClick}
              carregandoDetalhes={carregandoDetalhes}
              compartilhadosMap={compartilhadosMap}
              oabAtualNumero={oab?.oab_numero}
            />
          )}

          {/* Fallback se nenhum processo foi agrupado (todos sem instancia) */}
          {!temProcessosAgrupados && processosAgrupados.semInstancia.length === 0 && (
            <Droppable droppableId="processos-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {processos.map((processo, index) => (
                    <ProcessoCard 
                      key={processo.id}
                      processo={processo}
                      index={index}
                      onVerDetalhes={handleVerDetalhes}
                      onExcluir={handleExcluirClick}
                      carregandoDetalhes={carregandoDetalhes}
                      compartilhadoCom={compartilhadosMap[processo.numero_cnj]}
                      oabAtualNumero={oab?.oab_numero}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </DragDropContext>

      {/* Drawer de Detalhes */}
      <ProcessoOABDetalhes
        processo={selectedProcesso}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggleMonitoramento={handleToggleMonitoramento}
        onRefreshProcessos={fetchProcessos}
        onConsultarDetalhesRequest={consultarDetalhesRequest}
        onCarregarDetalhes={carregarDetalhes}
        onAtualizarProcesso={async (processoId, dados) => {
          const { atualizarProcesso } = useProcessosOAB(oabId);
          return await atualizarProcesso(processoId, dados);
        }}
        oab={oab}
      />

      {/* Dialog de confirmação de exclusão */}
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
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
