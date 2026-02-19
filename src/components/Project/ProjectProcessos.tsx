import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Filter,
  Users,
  AlertCircle,
  Trash2,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessoOAB, useAndamentosOAB } from '@/hooks/useOABs';
import { ProcessoOABDetalhes } from '@/components/Controladoria/ProcessoOABDetalhes';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useToast } from '@/hooks/use-toast';

interface ProjectProcessosProps {
  projectId: string;
  workspaceId: string | null;
  defaultWorkspaceId: string | null;
  isLocked?: boolean;
}

interface ProcessoVinculado {
  id: string;
  projeto_id: string;
  processo_oab_id: string;
  ordem: number;
  created_at: string;
  processo: ProcessoOAB;
}

interface ProcessosAgrupados {
  primeiraInstancia: ProcessoVinculado[];
  segundaInstancia: ProcessoVinculado[];
  semInstancia: ProcessoVinculado[];
}

// Mapa de códigos de tribunal CNJ para UF
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
      
      if (segmento === '8' && TRIBUNAL_UF_MAP[codigoTribunal]) {
        return TRIBUNAL_UF_MAP[codigoTribunal];
      }
      
      return `${segmento}.${codigoTribunal}`;
    }
  }
  
  return 'N/I';
};

const agruparPorInstancia = (processos: ProcessoVinculado[]): ProcessosAgrupados => {
  const primeiraInstancia: ProcessoVinculado[] = [];
  const segundaInstancia: ProcessoVinculado[] = [];
  const semInstancia: ProcessoVinculado[] = [];
  
  processos.forEach(item => {
    const instance = item.processo?.capa_completa?.instance;
    if (instance === 1) {
      primeiraInstancia.push(item);
    } else if (instance === 2) {
      segundaInstancia.push(item);
    } else {
      semInstancia.push(item);
    }
  });
  
  return { primeiraInstancia, segundaInstancia, semInstancia };
};

interface ProcessoCardProps {
  item: ProcessoVinculado;
  index: number;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  onDesvincular: (id: string) => void;
  carregandoDetalhes: string | null;
  isLocked?: boolean;
}

const ProcessoCard = ({ 
  item, 
  index, 
  onVerDetalhes, 
  onDesvincular,
  carregandoDetalhes,
  isLocked = true
}: ProcessoCardProps) => {
  const processo = item.processo;
  const temRecursoVinculado = processo?.capa_completa?.related_lawsuits?.length > 0;
  const processosRelacionados = processo?.capa_completa?.related_lawsuits || [];

  return (
    <Draggable 
      key={item.id} 
      draggableId={item.id} 
      index={index}
      isDragDisabled={isLocked}
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
              className={isLocked ? "cursor-not-allowed p-1 rounded" : "cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"}
            >
              <GripVertical className={`w-4 h-4 ${isLocked ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
            </div>

            {/* Processo Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-sm font-medium truncate">
                  {processo?.numero_cnj}
                </span>
                {processo?.monitoramento_ativo && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <Bell className="w-3 h-3 mr-1" />
                    Monitorado
                  </Badge>
                )}
                {(processo?.andamentos_nao_lidos || 0) > 0 && (
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
              <p className="text-sm text-muted-foreground truncate">
                {processo?.parte_ativa || 'Autor não identificado'} 
                {' vs '}
                {processo?.parte_passiva || 'Réu não identificado'}
              </p>
              {processo?.tribunal_sigla && (
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
                    onClick={() => onDesvincular(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desvincular processo</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVerDetalhes(processo)}
                disabled={carregandoDetalhes === processo?.id}
              >
                {carregandoDetalhes === processo?.id ? (
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
  processos: ProcessoVinculado[];
  droppableId: string;
  corBg: string;
  corBorder: string;
  corText: string;
  icon: React.ReactNode;
  onVerDetalhes: (processo: ProcessoOAB) => void;
  onDesvincular: (id: string) => void;
  carregandoDetalhes: string | null;
  isLocked?: boolean;
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
  onDesvincular,
  carregandoDetalhes,
  isLocked = true
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
              {processos.map((item, index) => (
                <ProcessoCard 
                  key={item.id}
                  item={item}
                  index={index}
                  onVerDetalhes={onVerDetalhes}
                  onDesvincular={onDesvincular}
                  carregandoDetalhes={carregandoDetalhes}
                  isLocked={isLocked}
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

export function ProjectProcessos({ projectId, workspaceId, defaultWorkspaceId, isLocked = true }: ProjectProcessosProps) {
  const [processosVinculados, setProcessosVinculados] = useState<ProcessoVinculado[]>([]);
  const [processosDisponiveis, setProcessosDisponiveis] = useState<ProcessoOAB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDisponivel, setSearchDisponivel] = useState("");
  const [filtroUF, setFiltroUF] = useState<string>('todos');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoOAB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState<string | null>(null);
  
  const { tenantId } = useTenantId();
  const { toast } = useToast();

  const loadProcessosVinculados = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('project_processos')
        .select(`
          id,
          projeto_id,
          processo_oab_id,
          workspace_id,
          ordem,
          created_at,
          processos_oab (
            id,
            oab_id,
            numero_cnj,
            tribunal,
            tribunal_sigla,
            parte_ativa,
            parte_passiva,
            partes_completas,
            status_processual,
            fase_processual,
            data_distribuicao,
            valor_causa,
            juizo,
            link_tribunal,
            capa_completa,
            detalhes_completos,
            detalhes_carregados,
            detalhes_request_id,
            detalhes_request_data,
            ordem_lista,
            monitoramento_ativo,
            tracking_id,
            ultima_atualizacao_detalhes,
            created_at,
            processos_oab_andamentos!left(id, lida)
          )
        `)
        .eq('projeto_id', projectId);

      // CORREÇÃO: Isolar processos por workspace
      // - Workspace padrão: mostra seus processos + órfãos (NULL)
      // - Outros workspaces: mostra APENAS seus processos (filtro estrito)
      if (workspaceId) {
        if (defaultWorkspaceId && workspaceId === defaultWorkspaceId) {
          // Workspace padrão inclui órfãos para compatibilidade
          query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
        } else {
          // Outros workspaces: filtro estrito
          query = query.eq('workspace_id', workspaceId);
        }
      }

      const { data, error } = await query.order('ordem', { ascending: true });

      if (error) throw error;

      const vinculados = (data || []).map(item => {
        const processoData = item.processos_oab as any;
        const andamentos = processoData?.processos_oab_andamentos || [];
        const naoLidos = andamentos.filter((a: any) => a.lida === false).length;
        
        const { processos_oab_andamentos, ...processoClean } = processoData || {};
        
        return {
          id: item.id,
          projeto_id: item.projeto_id,
          processo_oab_id: item.processo_oab_id,
          ordem: item.ordem || 0,
          created_at: item.created_at,
          processo: {
            ...processoClean,
            andamentos_nao_lidos: naoLidos
          } as ProcessoOAB
        };
      });

      setProcessosVinculados(vinculados);
    } catch (error) {
      console.error('Erro ao carregar processos vinculados:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId, defaultWorkspaceId]);

  useEffect(() => {
    loadProcessosVinculados();
  }, [loadProcessosVinculados]);

  const loadProcessosDisponiveis = async () => {
    try {
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('processos_oab')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('numero_cnj');

      if (error) throw error;

      const vinculadosIds = processosVinculados.map(p => p.processo_oab_id);
      const disponiveis = (data || []).filter(p => !vinculadosIds.includes(p.id));

      setProcessosDisponiveis(disponiveis as ProcessoOAB[]);
    } catch (error) {
      console.error('Erro ao carregar processos disponíveis:', error);
    }
  };

  const handleOpenAddDialog = () => {
    loadProcessosDisponiveis();
    setIsAddDialogOpen(true);
  };

  const handleVincularProcesso = async (processoOabId: string) => {
    try {
      if (!workspaceId) {
        toast({
          title: "Erro",
          description: "Nenhum workspace selecionado.",
          variant: "destructive",
        });
        return;
      }

      const novaOrdem = processosVinculados.length;
      
      const { error } = await supabase
        .from('project_processos')
        .insert({
          projeto_id: projectId,
          processo_oab_id: processoOabId,
          workspace_id: workspaceId,
          tenant_id: tenantId,
          ordem: novaOrdem
        });

      if (error) throw error;

      toast({
        title: "Processo vinculado",
        description: "Processo vinculado ao projeto com sucesso!",
      });

      loadProcessosVinculados();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao vincular processo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular processo.",
        variant: "destructive",
      });
    }
  };

  const handleDesvincularProcesso = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_processos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Processo desvinculado",
        description: "Processo removido do projeto.",
      });

      loadProcessosVinculados();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Erro ao desvincular processo:', error);
      toast({
        title: "Erro",
        description: "Erro ao desvincular processo.",
        variant: "destructive",
      });
    }
  };

  const handleVerDetalhes = (processo: ProcessoOAB) => {
    setSelectedProcesso(processo);
    setDrawerOpen(true);
  };

  const handleToggleMonitoramento = async (processo: ProcessoOAB) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('judit-ativar-monitoramento-oab', {
        body: { 
          processoOabId: processo.id, 
          numeroCnj: processo.numero_cnj, 
          ativar: !processo.monitoramento_ativo, 
          tenantId, 
          userId: user?.id,
          oabId: processo.oab_id
        }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao alterar monitoramento');
      }

      toast({
        title: !processo.monitoramento_ativo ? 'Monitoramento ativado' : 'Monitoramento desativado',
        description: !processo.monitoramento_ativo 
          ? 'Você receberá atualizações diárias' 
          : 'Histórico de andamentos mantido'
      });

      await loadProcessosVinculados();
      return data;
    } catch (error: any) {
      console.error('Erro ao alterar monitoramento:', error);
      toast({
        title: 'Erro ao alterar monitoramento',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const handleCarregarDetalhes = async (processoId: string, numeroCnj: string) => {
    setCarregandoDetalhes(processoId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('judit-buscar-detalhes-processo', {
        body: { processoOabId: processoId, numeroCnj, tenantId, userId: user?.id }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao carregar detalhes');
      }

      toast({
        title: 'Detalhes carregados',
        description: `${data.andamentosInseridos} novos andamentos`
      });

      await loadProcessosVinculados();
      return data;
    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: 'Erro ao carregar detalhes',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setCarregandoDetalhes(null);
    }
  };

  const handleConsultarDetalhesRequest = async (processoId: string, requestId: string) => {
    setCarregandoDetalhes(processoId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('judit-consultar-detalhes-request', {
        body: { processoOabId: processoId, requestId, tenantId, userId: user?.id }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao consultar');
      }

      toast({
        title: 'Andamentos atualizados',
        description: `${data.andamentosInseridos} novos andamentos`
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao consultar detalhes:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setCarregandoDetalhes(null);
    }
  };

  const atualizarOrdem = async (processosOrdenados: ProcessoVinculado[]) => {
    try {
      const updates = processosOrdenados.map((p, index) => ({
        id: p.id,
        ordem: index
      }));

      for (const update of updates) {
        await supabase
          .from('project_processos')
          .update({ ordem: update.ordem })
          .eq('id', update.id);
      }

      setProcessosVinculados(processosOrdenados.map((p, index) => ({ ...p, ordem: index })));
    } catch (error: any) {
      console.error('Erro ao atualizar ordem:', error);
    }
  };

  // Filtrar por busca
  const processosFiltradosBusca = useMemo(() => {
    if (!searchTerm) return processosVinculados;
    const search = searchTerm.toLowerCase();
    return processosVinculados.filter(item => {
      const p = item.processo;
      return (
        p?.numero_cnj?.toLowerCase().includes(search) ||
        p?.tribunal?.toLowerCase().includes(search) ||
        p?.parte_ativa?.toLowerCase().includes(search) ||
        p?.parte_passiva?.toLowerCase().includes(search)
      );
    });
  }, [processosVinculados, searchTerm]);

  // UFs disponíveis
  const ufsDisponiveis = useMemo(() => {
    const ufMap = new Map<string, number>();
    processosVinculados.forEach(item => {
      const uf = extrairUF(item.processo?.tribunal_sigla, item.processo?.numero_cnj);
      ufMap.set(uf, (ufMap.get(uf) || 0) + 1);
    });
    return Array.from(ufMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([uf, count]) => ({ uf, count }));
  }, [processosVinculados]);

  // Contagem de não lidos
  const naoLidosCount = useMemo(() => {
    return processosVinculados.filter(p => (p.processo?.andamentos_nao_lidos || 0) > 0).length;
  }, [processosVinculados]);

  // Aplicar filtro UF
  const processosFiltrados = useMemo(() => {
    let filtrados = processosFiltradosBusca;
    
    if (filtroUF === 'nao-lidos') {
      filtrados = filtrados.filter(p => (p.processo?.andamentos_nao_lidos || 0) > 0);
    } else if (filtroUF !== 'todos') {
      filtrados = filtrados.filter(p => extrairUF(p.processo?.tribunal_sigla, p.processo?.numero_cnj) === filtroUF);
    }
    
    return filtrados;
  }, [processosFiltradosBusca, filtroUF]);

  const processosAgrupados = useMemo(() => agruparPorInstancia(processosFiltrados), [processosFiltrados]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    
    if (sourceId !== destId) return;

    let listaAfetada: ProcessoVinculado[];
    if (sourceId === 'primeira-instancia') {
      listaAfetada = [...processosAgrupados.primeiraInstancia];
    } else if (sourceId === 'segunda-instancia') {
      listaAfetada = [...processosAgrupados.segundaInstancia];
    } else {
      listaAfetada = [...processosAgrupados.semInstancia];
    }

    const [reorderedItem] = listaAfetada.splice(result.source.index, 1);
    listaAfetada.splice(result.destination.index, 0, reorderedItem);

    const novaOrdem: ProcessoVinculado[] = [];
    
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

  const filteredDisponiveis = processosDisponiveis.filter(p => {
    if (!searchDisponivel) return true;
    const search = searchDisponivel.toLowerCase();
    return (
      p.numero_cnj?.toLowerCase().includes(search) ||
      p.tribunal?.toLowerCase().includes(search) ||
      p.parte_ativa?.toLowerCase().includes(search) ||
      p.parte_passiva?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const temProcessosAgrupados = 
    processosAgrupados.primeiraInstancia.length > 0 || 
    processosAgrupados.segundaInstancia.length > 0;

  return (
    <>
      {/* Header com busca, filtro e botão adicionar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar processos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {(ufsDisponiveis.length > 1 || naoLidosCount > 0) && (
          <Select value={filtroUF} onValueChange={setFiltroUF}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">
                Todos ({processosVinculados.length})
              </SelectItem>
              {naoLidosCount > 0 && (
                <SelectItem value="nao-lidos">
                  <span className="flex items-center gap-2">
                    <Bell className="w-3 h-3 text-red-500" />
                    Com novos andamentos ({naoLidosCount})
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
        )}

        <Button onClick={handleOpenAddDialog} className="gap-2">
          <Plus size={16} />
          Vincular Processo
        </Button>
      </div>

      {processosVinculados.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum processo vinculado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Vincular Processo" para adicionar processos da controladoria
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-4">
            {/* 1ª Instância */}
            <InstanciaSection
              titulo="1ª Instância"
              processos={processosAgrupados.primeiraInstancia}
              droppableId="primeira-instancia"
              corBg="bg-blue-50 dark:bg-blue-950/30"
              corBorder="border-blue-200 dark:border-blue-800"
              corText="text-blue-700 dark:text-blue-300"
              icon={<BookOpen className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
              onDesvincular={(id) => setDeleteConfirmId(id)}
              carregandoDetalhes={carregandoDetalhes}
              isLocked={isLocked}
            />

            {/* 2ª Instância */}
            <InstanciaSection
              titulo="2ª Instância"
              processos={processosAgrupados.segundaInstancia}
              droppableId="segunda-instancia"
              corBg="bg-green-50 dark:bg-green-950/30"
              corBorder="border-green-200 dark:border-green-800"
              corText="text-green-700 dark:text-green-300"
              icon={<BookUp className="w-5 h-5" />}
              onVerDetalhes={handleVerDetalhes}
              onDesvincular={(id) => setDeleteConfirmId(id)}
              carregandoDetalhes={carregandoDetalhes}
              isLocked={isLocked}
            />

            {/* Processos sem instância identificada */}
            {processosAgrupados.semInstancia.length > 0 && (
              <InstanciaSection
                titulo="Instância não identificada"
                processos={processosAgrupados.semInstancia}
                droppableId="sem-instancia"
                corBg="bg-muted/50"
                corBorder="border-muted-foreground/20"
                corText="text-muted-foreground"
                icon={<FileQuestion className="w-5 h-5" />}
                onVerDetalhes={handleVerDetalhes}
                onDesvincular={(id) => setDeleteConfirmId(id)}
                carregandoDetalhes={carregandoDetalhes}
                isLocked={isLocked}
              />
            )}

            {/* Fallback se nenhum processo foi agrupado */}
            {!temProcessosAgrupados && processosAgrupados.semInstancia.length === 0 && (
              <Droppable droppableId="processos-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {processosFiltrados.map((item, index) => (
                      <ProcessoCard 
                        key={item.id}
                        item={item}
                        index={index}
                        onVerDetalhes={handleVerDetalhes}
                        onDesvincular={(id) => setDeleteConfirmId(id)}
                        carregandoDetalhes={carregandoDetalhes}
                        isLocked={isLocked}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Drawer de Detalhes */}
      <ProcessoOABDetalhes
        processo={selectedProcesso}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onToggleMonitoramento={handleToggleMonitoramento}
        onRefreshProcessos={loadProcessosVinculados}
        onConsultarDetalhesRequest={handleConsultarDetalhesRequest}
        onCarregarDetalhes={handleCarregarDetalhes}
      />

      {/* Dialog para adicionar processo */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vincular Processo</DialogTitle>
            <DialogDescription>
              Selecione um processo da controladoria para vincular a este projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número, tribunal, partes..."
                value={searchDisponivel}
                onChange={(e) => setSearchDisponivel(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px]">
              {filteredDisponiveis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>Nenhum processo disponível encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDisponiveis.map((processo) => (
                    <div
                      key={processo.id}
                      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleVincularProcesso(processo.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono font-medium text-sm truncate">
                              {processo.numero_cnj}
                            </p>
                            {processo.monitoramento_ativo && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                <Bell className="w-3 h-3 mr-1" />
                                Monitorado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {processo.tribunal_sigla || processo.tribunal} • {processo.parte_ativa || "Sem parte ativa"} vs {processo.parte_passiva || "Sem parte passiva"}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Plus size={14} />
                          Vincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de desvinculação */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular processo?</AlertDialogTitle>
            <AlertDialogDescription>
              O processo será removido deste projeto, mas continuará disponível na controladoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDesvincularProcesso(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
