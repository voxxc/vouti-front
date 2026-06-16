import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  GripVertical,
  Briefcase,
  Trash2,
  Pencil,
  FolderInput,
  X,
  MoreVertical,
  Tag,
  Check,
  ArrowRightLeft,
  FolderSymlink,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useProjectProtocolos, ProjectProtocolo } from '@/hooks/useProjectProtocolos';
import { AddProtocoloDialog } from './AddProtocoloDialog';
import { ProjectProtocoloContent } from './ProjectProtocoloContent';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useToast } from '@/hooks/use-toast';
import { fetchAllPaginated, fetchAllPaginatedIn } from '@/lib/supabasePagination';
import { useProjectProtocoloMarcadores } from '@/hooks/useProjectProtocoloMarcadores';
import { MarcadorDialog } from './MarcadorDialog';
import { MoveProtocoloDialog } from './MoveProtocoloDialog';
import type { ProjectWorkspace } from '@/hooks/useProjectWorkspaces';

interface ProjectProtocolosListProps {
  projectId: string;
  workspaceId?: string | null;
  defaultWorkspaceId?: string | null;
  isLocked?: boolean;
  initialProtocoloId?: string | null;
  onProtocoloConsumed?: () => void;
  workspaces?: ProjectWorkspace[];
}

const STATUS_LABELS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const STATUS_COLORS: Record<ProjectProtocolo['status'], string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  concluido: 'bg-green-500/10 text-green-600 border-green-500/20',
  cancelado: 'bg-muted text-muted-foreground border-muted'
};

export function ProjectProtocolosList({ projectId, workspaceId, defaultWorkspaceId, isLocked = true, initialProtocoloId, onProtocoloConsumed, workspaces = [] }: ProjectProtocolosListProps) {
  const { protocolos, loading, refetch, createProtocolo, updateProtocolo, deleteProtocolo, addEtapa, updateEtapa, deleteEtapa, reorderProtocolos } = useProjectProtocolos(projectId, workspaceId, defaultWorkspaceId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string | null>(null);
  const [view, setView] = useState<'lista' | 'detalhes'>('lista');

  // ESC dentro do detalhe volta para a lista sem fechar o drawer do projeto
  useEffect(() => {
    if (view !== 'detalhes') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Popover/Dropdown aberto → deixa o Radix fechar primeiro
      if (document.querySelector('[data-radix-popper-content-wrapper]')) return;
      // Se houver mais de um dialog/alertdialog aberto, há um modal interno
      // empilhado sobre o Sheet do projeto — deixa ele fechar primeiro.
      const openDialogs = document.querySelectorAll(
        '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'
      );
      if (openDialogs.length > 1) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setView('lista');
      setSelectedProtocoloId(null);
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [view]);

  // Carteira state
  const [carteiras, setCarteiras] = useState<any[]>([]);
  const [carteiraProtocolos, setCarteiraProtocolos] = useState<Record<string, string[]>>({});
  const [isCarteiraDialogOpen, setIsCarteiraDialogOpen] = useState(false);
  const [novaCarteiraNome, setNovaCarteiraNome] = useState('');
  const [novaCarteiraCor, setNovaCarteiraCor] = useState('#6366f1');
  const [editandoCarteira, setEditandoCarteira] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { tenantId } = useTenantId();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Marcadores
  const protocoloIds = protocolos.map((p) => p.id);
  const {
    marcadores,
    createMarcador,
    updateMarcador,
    deleteMarcador,
    toggleAssignment,
    getMarcadoresByProtocolo,
  } = useProjectProtocoloMarcadores(projectId, protocoloIds);
  const [marcadorDialogOpen, setMarcadorDialogOpen] = useState(false);
  const [editingMarcador, setEditingMarcador] = useState<{ id: string; nome: string; cor: string } | null>(null);

  // Move-to-other-project dialog
  const [moveDialogProtocolo, setMoveDialogProtocolo] = useState<ProjectProtocolo | null>(null);

  const handleMoveToWorkspace = async (protocoloId: string, targetWorkspaceId: string) => {
    try {
      const { error } = await supabase
        .from('project_protocolos')
        .update({ workspace_id: targetWorkspaceId })
        .eq('id', protocoloId);
      if (error) throw error;
      const target = workspaces.find((w) => w.id === targetWorkspaceId);
      toast({ title: 'Processo movido', description: target ? `Para a aba "${target.nome}"` : undefined });
      refetch();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const selectedProtocolo = selectedProtocoloId 
    ? protocolos.find(p => p.id === selectedProtocoloId) ?? null 
    : null;

  // Auto-open etapa from URL query param (e.g., ?etapa=UUID from notification click)
  useEffect(() => {
    const etapaParam = searchParams.get('etapa');
    if (!etapaParam || loading || !protocolos.length) return;

    for (const proto of protocolos) {
      const etapa = proto.etapas?.find(e => e.id === etapaParam);
      if (etapa) {
        setSelectedProtocoloId(proto.id);
        setView('detalhes');
        // Clean up query param
        searchParams.delete('etapa');
        setSearchParams(searchParams, { replace: true });
        break;
      }
    }
  }, [searchParams, loading, protocolos]);

  // Auto-open protocolo from URL query param (e.g., ?protocolo=UUID from notification click)
  useEffect(() => {
    const protocoloParam = searchParams.get('protocolo');
    if (!protocoloParam || loading || !protocolos.length) return;

    const found = protocolos.find(p => p.id === protocoloParam);
    if (found) {
      setSelectedProtocoloId(found.id);
      setView('detalhes');
    }
    // Clean up query param
    searchParams.delete('protocolo');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, loading, protocolos]);

  // Auto-open protocolo from prop (e.g., from notification via ProjectDrawer)
  useEffect(() => {
    if (!initialProtocoloId || loading || !protocolos.length) return;

    const found = protocolos.find(p => p.id === initialProtocoloId);
    if (found) {
      setSelectedProtocoloId(found.id);
      setView('detalhes');
      onProtocoloConsumed?.();
    }
  }, [initialProtocoloId, loading, protocolos]);

  // Load carteiras
  const loadCarteiras = useCallback(async () => {
    if (!workspaceId || !tenantId) return;
    try {
      const { data: carteirasData } = await fetchAllPaginated<any>(() =>
        supabase
          .from('project_carteiras')
          .select('*')
          .eq('projeto_id', projectId)
          .eq('workspace_id', workspaceId)
          .order('ordem') as any
      );
      
      setCarteiras(carteirasData || []);

      if (carteirasData?.length) {
        const carteiraIds = carteirasData.map((c: any) => c.id);
        const { data: cpData } = await fetchAllPaginatedIn<any>(carteiraIds, (chunk) =>
          supabase
            .from('project_carteira_protocolos' as any)
            .select('carteira_id, project_protocolo_id')
            .in('carteira_id', chunk) as any
        );
        
        const map: Record<string, string[]> = {};
        ((cpData as any[]) || []).forEach((cp: any) => {
          if (!map[cp.carteira_id]) map[cp.carteira_id] = [];
          map[cp.carteira_id].push(cp.project_protocolo_id);
        });
        setCarteiraProtocolos(map);
      } else {
        setCarteiraProtocolos({});
      }
    } catch (error) {
      console.error('Erro ao carregar carteiras:', error);
    }
  }, [projectId, workspaceId, tenantId]);

  useEffect(() => {
    loadCarteiras();
  }, [loadCarteiras]);

  const handleCriarCarteira = async () => {
    if (!novaCarteiraNome.trim() || !workspaceId || !tenantId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_carteiras')
        .insert({
          projeto_id: projectId,
          workspace_id: workspaceId,
          tenant_id: tenantId,
          nome: novaCarteiraNome.trim(),
          cor: novaCarteiraCor,
          ordem: carteiras.length,
          created_by: user?.id!,
        });
      if (error) throw error;
      toast({ title: 'Carteira criada' });
      setNovaCarteiraNome('');
      setIsCarteiraDialogOpen(false);
      loadCarteiras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditarCarteira = async () => {
    if (!editandoCarteira || !novaCarteiraNome.trim()) return;
    try {
      const { error } = await supabase
        .from('project_carteiras')
        .update({ nome: novaCarteiraNome.trim(), cor: novaCarteiraCor })
        .eq('id', editandoCarteira.id);
      if (error) throw error;
      toast({ title: 'Carteira atualizada' });
      setEditandoCarteira(null);
      setNovaCarteiraNome('');
      setIsCarteiraDialogOpen(false);
      loadCarteiras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletarCarteira = async (carteiraId: string) => {
    try {
      await supabase.from('project_carteira_protocolos' as any).delete().eq('carteira_id', carteiraId);
      await supabase.from('project_carteiras').delete().eq('id', carteiraId);
      toast({ title: 'Carteira removida' });
      loadCarteiras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleMoverParaCarteira = async (protocoloId: string, carteiraId: string) => {
    try {
      // Remove de outras carteiras primeiro
      for (const [cId, pIds] of Object.entries(carteiraProtocolos)) {
        if (pIds.includes(protocoloId)) {
          await supabase
            .from('project_carteira_protocolos' as any)
            .delete()
            .eq('carteira_id', cId)
            .eq('project_protocolo_id', protocoloId);
        }
      }
      // Adiciona na nova
      await supabase
        .from('project_carteira_protocolos' as any)
        .insert({ carteira_id: carteiraId, project_protocolo_id: protocoloId } as any);
      loadCarteiras();
    } catch (error) {
      console.error('Erro ao mover protocolo para carteira:', error);
    }
  };

  const handleRemoverDeCarteira = async (protocoloId: string, carteiraId: string) => {
    try {
      await supabase
        .from('project_carteira_protocolos' as any)
        .delete()
        .eq('carteira_id', carteiraId)
        .eq('project_protocolo_id', protocoloId);
      loadCarteiras();
    } catch (error) {
      console.error('Erro ao remover protocolo da carteira:', error);
    }
  };

  // Early return: Wait for workspace to be defined
  if (workspaceId === undefined && defaultWorkspaceId === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // IDs de protocolos que estão em alguma carteira
  const protocolosEmCarteiras = new Set(
    Object.values(carteiraProtocolos).flat()
  );

  const filteredProtocolos = protocolos.filter(protocolo => {
    const matchesSearch = protocolo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      protocolo.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || protocolo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Protocolos na lista principal (não vinculados a nenhuma carteira)
  const protocolosSemCarteira = filteredProtocolos.filter(p => !protocolosEmCarteiras.has(p.id));

  const handleProtocoloClick = (protocolo: ProjectProtocolo) => {
    setSelectedProtocoloId(protocolo.id);
    setView('detalhes');
  };

  const handleCreateProtocolo = async (data: { nome: string; descricao?: string; responsavelId?: string; dataPrevisao?: Date; observacoes?: string }) => {
    await createProtocolo(data);
    setIsAddDialogOpen(false);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    
    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;

    // Drag to a carteira
    if (destId.startsWith('carteira-') && sourceId !== destId) {
      const carteiraId = destId.replace('carteira-', '');
      const draggedId = result.draggableId;
      handleMoverParaCarteira(draggedId, carteiraId);
      return;
    }

    // Drag back to main list from a carteira
    if (destId === 'protocolos-list' && sourceId.startsWith('carteira-')) {
      const carteiraId = sourceId.replace('carteira-', '');
      const draggedId = result.draggableId;
      handleRemoverDeCarteira(draggedId, carteiraId);
      return;
    }

    // Reorder within main list
    if (sourceId === 'protocolos-list' && destId === 'protocolos-list') {
      if (result.destination.index === result.source.index) return;
      const reordered = Array.from(protocolosSemCarteira);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      reorderProtocolos(reordered.map(p => p.id));
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Inline detail view
  if (view === 'detalhes' && selectedProtocolo) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => { setView('lista'); setSelectedProtocoloId(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">{selectedProtocolo.nome}</span>
        </div>
        <ProjectProtocoloContent
          protocolo={selectedProtocolo}
          onUpdate={updateProtocolo}
          onDelete={async (id) => {
            await deleteProtocolo(id);
            setView('lista');
            setSelectedProtocoloId(null);
          }}
          onAddEtapa={addEtapa}
          onUpdateEtapa={updateEtapa}
          onDeleteEtapa={deleteEtapa}
          projectId={projectId}
          onRefetch={refetch}
          onClose={() => { setView('lista'); setSelectedProtocoloId(null); }}
        />
      </div>
    );
  }

  const renderProtocoloItem = (protocolo: ProjectProtocolo, index: number) => {
    const etapasConcluidas = protocolo.etapas?.filter(e => e.status === 'concluido').length || 0;
    const totalEtapas = protocolo.etapas?.length || 0;
    const carteiraAtualId = Object.entries(carteiraProtocolos).find(
      ([, ids]) => ids.includes(protocolo.id)
    )?.[0];
    const protocoloMarcadores = getMarcadoresByProtocolo(protocolo.id);
    const assignedIds = new Set(protocoloMarcadores.map((m) => m.id));
    const otherWorkspaces = workspaces.filter((w) => w.id !== workspaceId);
    
    return (
      <Draggable
        key={protocolo.id}
        draggableId={protocolo.id}
        index={index}
        isDragDisabled={isLocked}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            onClick={() => handleProtocoloClick(protocolo)}
            className={`p-4 hover:bg-accent cursor-pointer border-b transition-colors ${snapshot.isDragging ? 'bg-accent shadow-lg' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <div
                  {...provided.dragHandleProps}
                  className={`mt-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className={`h-4 w-4 ${isLocked ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {protocolo.nome.toUpperCase()}
                  </p>
                  {totalEtapas > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {etapasConcluidas}/{totalEtapas} etapas concluídas
                    </p>
                  )}
                  {protocoloMarcadores.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {protocoloMarcadores.map((m) => (
                        <Badge
                          key={m.id}
                          className="text-[10px] px-2 py-0 border-transparent text-white"
                          style={{ backgroundColor: m.cor }}
                        >
                          {m.nome}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Mais ações"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {/* Marcadores */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <Tag className="h-4 w-4" />
                        Adicionar Marcador
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-60 max-h-80 overflow-y-auto">
                          {marcadores.length === 0 && (
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                              Nenhum marcador criado
                            </DropdownMenuLabel>
                          )}
                          {marcadores.map((m) => {
                            const isAssigned = assignedIds.has(m.id);
                            return (
                              <DropdownMenuItem
                                key={m.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  toggleAssignment(protocolo.id, m.id);
                                }}
                                className="gap-2"
                              >
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: m.cor }}
                                />
                                <span className="flex-1 truncate">{m.nome}</span>
                                {isAssigned && <Check className="h-3.5 w-3.5" />}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMarcador({ id: m.id, nome: m.nome, cor: m.cor });
                                    setMarcadorDialogOpen(true);
                                  }}
                                  className="opacity-60 hover:opacity-100"
                                  title="Editar"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Excluir marcador "${m.nome}"?`)) {
                                      deleteMarcador(m.id);
                                    }
                                  }}
                                  className="opacity-60 hover:opacity-100 text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setEditingMarcador(null);
                              setMarcadorDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Criar novo marcador
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    {/* Trocar de Workspace */}
                    {otherWorkspaces.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2">
                          <ArrowRightLeft className="h-4 w-4" />
                          Trocar de Workspace
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-56">
                            {otherWorkspaces.map((w) => (
                              <DropdownMenuItem
                                key={w.id}
                                onClick={() => handleMoveToWorkspace(protocolo.id, w.id)}
                                className="gap-2"
                              >
                                <FolderKanban className="h-3.5 w-3.5" />
                                <span className="truncate">{w.nome}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    )}

                    {/* Mover para outro projeto */}
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setMoveDialogProtocolo(protocolo);
                      }}
                      className="gap-2"
                    >
                      <FolderSymlink className="h-4 w-4" />
                      Mover para outro projeto
                    </DropdownMenuItem>

                    {/* Carteiras (mantém) */}
                    {!isLocked && carteiras.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="gap-2">
                          <FolderInput className="h-4 w-4" />
                          Mover para carteira
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-56">
                            {carteiras.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                disabled={carteiraAtualId === c.id}
                                onClick={() => handleMoverParaCarteira(protocolo.id, c.id)}
                                className="gap-2"
                              >
                                <Briefcase className="h-3.5 w-3.5" style={{ color: c.cor }} />
                                <span className="truncate">{c.nome}</span>
                                {carteiraAtualId === c.id && (
                                  <Badge variant="secondary" className="ml-auto text-[10px]">atual</Badge>
                                )}
                              </DropdownMenuItem>
                            ))}
                            {carteiraAtualId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoverDeCarteira(protocolo.id, carteiraAtualId)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Remover da carteira
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge className={STATUS_COLORS[protocolo.status]}>
                  {STATUS_LABELS[protocolo.status]}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
        >
          <FolderKanban className="h-5 w-5" />
          <span>Processos</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Badge variant="secondary" className="ml-2">
            {protocolos.length}
          </Badge>
        </button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsCarteiraDialogOpen(true)}
            title="Nova Carteira"
          >
            <Briefcase className="h-4 w-4" />
          </Button>
          <Button 
            variant="professional" 
            className="gap-2"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus size={16} />
            Novo processo
          </Button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar processos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os processos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* List + Carteiras */}
          <div className="flex-1 overflow-y-auto pr-2">
            {filteredProtocolos.length === 0 && carteiras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {protocolos.length === 0 ? (
                  <>
                    <p className="text-lg font-medium">Nenhum processo criado</p>
                    <p className="text-sm">Clique em "Novo processo" para adicionar</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">Nenhum processo encontrado</p>
                    <p className="text-sm">Tente ajustar os filtros</p>
                  </>
                )}
              </div>
            ) : (
              <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {/* Main list (protocolos sem carteira) */}
                <Droppable droppableId="protocolos-list">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1 min-h-[40px] rounded-md transition-colors ${
                        snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/40 ring-dashed' : ''
                      }`}
                    >
                      {protocolosSemCarteira.map((protocolo, index) => 
                        renderProtocoloItem(protocolo, index)
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Carteiras */}
                {carteiras.map((carteira) => {
                  const protocoIds = carteiraProtocolos[carteira.id] || [];
                  const protocolosNaCarteira = filteredProtocolos.filter(p => protocoIds.includes(p.id));
                  return (
                    <Collapsible
                      key={carteira.id}
                      defaultOpen
                      open={isDragging ? true : undefined}
                      className="space-y-2 mt-4"
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center gap-2 py-2 hover:opacity-80 transition-opacity">
                          <Briefcase className="w-4 h-4" style={{ color: carteira.cor }} />
                          <span className="font-semibold text-sm hover:underline cursor-pointer">{carteira.nome}</span>
                          <Badge variant="secondary" className="ml-auto mr-2">
                            {protocolosNaCarteira.length}
                          </Badge>
                          {!isLocked && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditandoCarteira(carteira);
                                  setNovaCarteiraNome(carteira.nome);
                                  setNovaCarteiraCor(carteira.cor || '#6366f1');
                                  setIsCarteiraDialogOpen(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); handleDeletarCarteira(carteira.id); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Droppable droppableId={`carteira-${carteira.id}`}>
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`space-y-1 pl-3 border-l-2 ml-2 min-h-[40px] max-h-[400px] overflow-y-auto rounded-r-md transition-colors ${
                                snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/40 ring-dashed' : ''
                              }`}
                              style={{ borderColor: carteira.cor }}
                            >
                              {protocolosNaCarteira.length === 0 && (
                                <p className="text-xs text-muted-foreground py-2">
                                  {isLocked ? 'Carteira vazia' : 'Desbloqueie o cadeado e arraste processos para cá'}
                                </p>
                              )}
                              {protocolosNaCarteira.map((protocolo, index) =>
                                renderProtocoloItem(protocolo, index)
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </DragDropContext>
            )}
          </div>
        </>
      )}

      <AddProtocoloDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleCreateProtocolo}
      />

      {/* Dialog Criar Carteira */}
      <Dialog open={isCarteiraDialogOpen} onOpenChange={(open) => {
        setIsCarteiraDialogOpen(open);
        if (!open) { setEditandoCarteira(null); setNovaCarteiraNome(''); setNovaCarteiraCor('#6366f1'); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editandoCarteira ? 'Editar Carteira' : 'Nova Carteira'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={novaCarteiraNome}
                onChange={(e) => setNovaCarteiraNome(e.target.value)}
                placeholder="Nome da carteira..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <input
                type="color"
                value={novaCarteiraCor}
                onChange={(e) => setNovaCarteiraCor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsCarteiraDialogOpen(false); setEditandoCarteira(null); }}>Cancelar</Button>
              <Button onClick={editandoCarteira ? handleEditarCarteira : handleCriarCarteira} disabled={!novaCarteiraNome.trim()}>
                {editandoCarteira ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MarcadorDialog
        open={marcadorDialogOpen}
        onOpenChange={(o) => {
          setMarcadorDialogOpen(o);
          if (!o) setEditingMarcador(null);
        }}
        initial={editingMarcador}
        onSubmit={async (nome, cor) => {
          if (editingMarcador) {
            await updateMarcador(editingMarcador.id, nome, cor);
          } else {
            await createMarcador(nome, cor);
          }
        }}
      />

      {moveDialogProtocolo && (
        <MoveProtocoloDialog
          open={!!moveDialogProtocolo}
          onOpenChange={(o) => { if (!o) setMoveDialogProtocolo(null); }}
          protocoloId={moveDialogProtocolo.id}
          protocoloTitulo={moveDialogProtocolo.nome}
          currentProjectId={projectId}
          currentWorkspaceId={workspaceId ?? null}
          currentWorkspaceName={workspaces.find((w) => w.id === workspaceId)?.nome ?? null}
          onMoved={() => { setMoveDialogProtocolo(null); refetch(); }}
        />
      )}
    </div>
  );
}
