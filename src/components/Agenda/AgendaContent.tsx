import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";

import AgendaCalendar from "./AgendaCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2, UserCheck, MessageSquare, Scale, FileText, ExternalLink, MoreVertical, CalendarClock, Pencil, ChevronDown, Flag, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeadlineComentarios } from "./DeadlineComentarios";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "./UserTagSelector";
import EditarPrazoDialog from "./EditarPrazoDialog";
import { ProcessoOABDetalhes } from "@/components/Controladoria/ProcessoOABDetalhes";
import { ProcessoOAB } from "@/hooks/useOABs";
import { useToggleMonitoramento } from "@/hooks/useToggleMonitoramento";
import { Deadline, DeadlineFormData } from "@/types/agenda";
import { format, isSameDay, isPast, isFuture, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { cn } from "@/lib/utils";
import { notifyDeadlineAssigned, notifyDeadlineTagged } from "@/utils/notificationHelpers";

interface AgendaContentProps {
  module?: string;
  initialDeadlineId?: string;
}

// Componente de abas para Origem/Vinculado no detalhamento de prazo
function OriginTabs({
  hasVinculado,
  origemLabel,
  vinculadoLabel,
  selectedDeadline,
  onViewProcesso,
  onNavigateProject,
}: {
  hasVinculado: boolean;
  origemLabel: string;
  vinculadoLabel: string;
  selectedDeadline: Deadline;
  onViewProcesso: (id: string) => void;
  onNavigateProject: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'origem' | 'vinculado'>('origem');

  return (
    <div className="space-y-3">
      {/* Tab buttons */}
      <div className="flex gap-6 border-b">
        <button
          onClick={() => setActiveTab('origem')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative",
            activeTab === 'origem'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {origemLabel}
          {activeTab === 'origem' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        {hasVinculado && (
          <button
            onClick={() => setActiveTab('vinculado')}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              activeTab === 'vinculado'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {vinculadoLabel}
            {activeTab === 'vinculado' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="text-sm space-y-1">
        {activeTab === 'origem' && selectedDeadline.processoOrigem && (
          <>
            {selectedDeadline.processoOrigem.numeroCnj && (
              <p><strong>CNJ:</strong> {selectedDeadline.processoOrigem.numeroCnj}</p>
            )}
            {selectedDeadline.processoOrigem.parteAtiva && (
              <p><strong>Autor:</strong> {selectedDeadline.processoOrigem.parteAtiva}</p>
            )}
            {selectedDeadline.processoOrigem.partePassiva && (
              <p><strong>Réu:</strong> {selectedDeadline.processoOrigem.partePassiva}</p>
            )}
            {selectedDeadline.processoOrigem.tribunal && (
              <p><strong>Tribunal:</strong> {selectedDeadline.processoOrigem.tribunal}</p>
            )}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-primary"
              onClick={() => onViewProcesso(selectedDeadline.processoOrigem!.id)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver Processo Completo
            </Button>
          </>
        )}

        {activeTab === 'origem' && selectedDeadline.protocoloOrigem && (
          <>
            {selectedDeadline.protocoloOrigem.protocoloNome && (
              <p><strong>Processo:</strong> {selectedDeadline.protocoloOrigem.protocoloNome}</p>
            )}
            {selectedDeadline.protocoloOrigem.etapaNome && (
              <p><strong>Etapa:</strong> {selectedDeadline.protocoloOrigem.etapaNome}</p>
            )}
            {selectedDeadline.protocoloOrigem.projectId && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-primary"
                onClick={() => onNavigateProject(selectedDeadline.protocoloOrigem!.projectId!)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Projeto
              </Button>
            )}
          </>
        )}

        {activeTab === 'vinculado' && selectedDeadline.casoVinculado && (
          <>
            {selectedDeadline.casoVinculado.numeroCnj && (
              <p><strong>CNJ:</strong> {selectedDeadline.casoVinculado.numeroCnj}</p>
            )}
            {selectedDeadline.casoVinculado.parteAtiva && (
              <p><strong>Autor:</strong> {selectedDeadline.casoVinculado.parteAtiva}</p>
            )}
            {selectedDeadline.casoVinculado.partePassiva && (
              <p><strong>Réu:</strong> {selectedDeadline.casoVinculado.partePassiva}</p>
            )}
            {selectedDeadline.casoVinculado.tribunal && (
              <p><strong>Tribunal:</strong> {selectedDeadline.casoVinculado.tribunal}</p>
            )}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-primary"
              onClick={() => onViewProcesso(selectedDeadline.casoVinculado!.id)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver Caso
            </Button>
          </>
        )}

        {activeTab === 'vinculado' && selectedDeadline.protocoloVinculado && (
          <>
            {selectedDeadline.protocoloVinculado.protocoloNome && (
              <p><strong>Processo:</strong> {selectedDeadline.protocoloVinculado.protocoloNome}</p>
            )}
            {selectedDeadline.protocoloVinculado.projectId && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-primary"
                onClick={() => onNavigateProject(selectedDeadline.protocoloVinculado!.projectId!)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver Projeto
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AgendaContent({ module = 'legal', initialDeadlineId }: AgendaContentProps) {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { navigate, tenantSlug } = useTenantNavigation();
  const { toast } = useToast();

  // ===== Estados principais =====
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [formData, setFormData] = useState<DeadlineFormData>({
    title: "",
    description: "",
    date: new Date(),
    projectId: ""
  });
  const [selectedAdvogado, setSelectedAdvogado] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [completedFilterUserId, setCompletedFilterUserId] = useState<string | null>(null);
  const [confirmCompleteDeadlineId, setConfirmCompleteDeadlineId] = useState<string | null>(null);
  const [comentarioConclusao, setComentarioConclusao] = useState("");
  const [criarSubtarefa, setCriarSubtarefa] = useState(false);
  const [subtarefaDescricao, setSubtarefaDescricao] = useState("");
  const [cumprirEtapa, setCumprirEtapa] = useState(false);
  const [etapaJaConcluida, setEtapaJaConcluida] = useState(false);
  

  // Project/workspace/processo/etapa selection for creation
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; client: string }>>([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; nome: string }>>([]);
  const [availableProtocolos, setAvailableProtocolos] = useState<Array<{ id: string; nome: string; processo_oab_id?: string | null }>>([]);
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string>("");
  const [availableEtapas, setAvailableEtapas] = useState<Array<{ id: string; nome: string; protocolo_nome: string | null }>>([]);
  const [selectedEtapaId, setSelectedEtapaId] = useState<string>("");

  // User filter (default: current user)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

  // Estados para modal de extensão de prazo
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [extendDeadline, setExtendDeadline] = useState<Deadline | null>(null);
  const [novaDataExtensao, setNovaDataExtensao] = useState<Date | undefined>(undefined);
  const [motivoExtensao, setMotivoExtensao] = useState("");
  const [salvandoExtensao, setSalvandoExtensao] = useState(false);

  // Estados para modal de edição de prazo
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDeadline, setEditDeadline] = useState<Deadline | null>(null);

  // Estados para reabrir prazo concluído
  const [reopenDeadlineId, setReopenDeadlineId] = useState<string | null>(null);
  const [reopenMotivo, setReopenMotivo] = useState("");

  // Estados para drawer do processo OAB
  const [processoDrawerOpen, setProcessoDrawerOpen] = useState(false);
  const [selectedProcessoOAB, setSelectedProcessoOAB] = useState<ProcessoOAB | null>(null);
  const { toggleMonitoramento } = useToggleMonitoramento();

  // Collapsible section state
  const [activeSection, setActiveSection] = useState<"upcoming" | "completed" | "overdue" | null>(null);

  // Mobile calendar toggle
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const openEditDialog = (deadline: Deadline) => {
    setEditDeadline(deadline);
    setIsEditDialogOpen(true);
  };

  // ===== Helpers de data =====
  const safeParseDate = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    try {
      const parsed = parseISO(dateString + 'T12:00:00');
      if (!isValid(parsed)) return new Date();
      return parsed;
    } catch {
      return new Date();
    }
  };

  const safeFormatDate = (date: Date, formatStr: string = "dd/MM/yyyy"): string => {
    try {
      if (!isValid(date)) return "Data inválida";
      return format(date, formatStr, { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const safeIsPast = (date: Date): boolean => {
    try {
      return isValid(date) && isPast(date);
    } catch {
      return false;
    }
  };

  const safeParseTimestamp = (timestamp: string | null | undefined): Date => {
    if (!timestamp) return new Date();
    try {
      const parsed = new Date(timestamp);
      return isValid(parsed) ? parsed : new Date();
    } catch {
      return new Date();
    }
  };

  // ===== Effects =====
  useEffect(() => {
    if (!user) return;
    
    const loadInitialData = async () => {
      await fetchDeadlinesAsync();
      const adminStatus = await checkIfUserIsAdminOrController(user.id, tenantId || undefined);
      setIsAdmin(adminStatus);
    };
    
    loadInitialData();
  }, [user, tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchAllUsers();
    }
  }, [tenantId]);

  // Set default filter to current user once allUsers loads
  useEffect(() => {
    if (user && allUsers.length > 0 && selectedUserFilter === "all") {
      setSelectedUserFilter(user.id);
    }
  }, [user, allUsers]);

  // Auto-open deadline details when initialDeadlineId is provided
  useEffect(() => {
    if (initialDeadlineId && deadlines.length > 0) {
      const target = deadlines.find(d => d.id === initialDeadlineId);
      if (target) {
        openDeadlineDetails(target);
      }
    }
  }, [initialDeadlineId, deadlines]);


  const fetchDeadlinesAsync = async () => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select(`
          *,
          projects (name, client),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (
            user_id, full_name, avatar_url
          ),
          deadline_tags (
            tagged_user_id,
            tagged_user:profiles!deadline_tags_tagged_user_id_fkey (
              user_id, full_name, avatar_url
            )
          ),
          processo_oab:processos_oab (
            id, numero_cnj, parte_ativa, parte_passiva, tribunal
          ),
          protocolo_etapa:project_protocolo_etapas (
            id, nome,
            protocolo:project_protocolos (id, nome, project_id, processo_oab_id, workspace_id)
          )
        `)
        .eq('module', module)
        .order('date', { ascending: true });

      if (error) {
        console.error('[AgendaContent] Error fetching deadlines:', error);
        return;
      }

      // Collect processo_oab_ids from protocolos (for deadlines that come from a protocolo but need the linked caso)
      const processoOabIdsFromProtocolos = new Set<string>();
      // Collect processo_oab_ids from deadlines that have caso but no protocolo (to find linked protocolo)
      const processoOabIdsFromCasos = new Set<string>();

      (data || []).forEach((d: any) => {
        const protocoloProcessoOabId = d.protocolo_etapa?.protocolo?.processo_oab_id;
        if (protocoloProcessoOabId) {
          processoOabIdsFromProtocolos.add(protocoloProcessoOabId);
        }
        if (d.processo_oab_id && !d.protocolo_etapa_id) {
          processoOabIdsFromCasos.add(d.processo_oab_id);
        }
      });

      // Batch fetch: casos vinculados (from protocolo's processo_oab_id)
      let casosMap: Record<string, any> = {};
      if (processoOabIdsFromProtocolos.size > 0) {
        const { data: casos } = await supabase
          .from('processos_oab')
          .select('id, numero_cnj, parte_ativa, parte_passiva, tribunal')
          .in('id', Array.from(processoOabIdsFromProtocolos));
        (casos || []).forEach(c => { casosMap[c.id] = c; });
      }

      // Batch fetch: protocolos vinculados (from caso's processo_oab_id)
      let protocolosMap: Record<string, any> = {};
      if (processoOabIdsFromCasos.size > 0) {
        const { data: prots } = await supabase
          .from('project_protocolos')
          .select('id, nome, project_id, processo_oab_id, workspace_id')
          .in('processo_oab_id', Array.from(processoOabIdsFromCasos));
        (prots || []).forEach(p => {
          if (p.processo_oab_id) protocolosMap[p.processo_oab_id] = p;
        });
      }

      // Collect workspace_ids for batch fetch (direct from deadline.workspace_id)
      const workspaceIds = new Set<string>();
      (data || []).forEach((d: any) => {
        if (d.workspace_id) workspaceIds.add(d.workspace_id);
      });

      // Batch fetch workspace names
      let workspaceNameMap: Record<string, string> = {};
      if (workspaceIds.size > 0) {
        const { data: wsData } = await supabase
          .from('project_workspaces')
          .select('id, nome')
          .in('id', Array.from(workspaceIds));
        (wsData || []).forEach((ws: any) => { workspaceNameMap[ws.id] = ws.nome; });
      }

      // Batch fetch creator profiles
      const creatorIds = new Set<string>();
      (data || []).forEach((d: any) => {
        if (d.user_id) creatorIds.add(d.user_id);
        if (d.concluido_por) creatorIds.add(d.concluido_por);
      });
      let creatorMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (creatorIds.size > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(creatorIds));
        (creators || []).forEach((c: any) => { creatorMap[c.user_id] = c; });
      }

      const mappedDeadlines: Deadline[] = (data || []).map(deadline => {
        const protocoloProcessoOabId = deadline.protocolo_etapa?.protocolo?.processo_oab_id;
        const casoFromProtocolo = protocoloProcessoOabId ? casosMap[protocoloProcessoOabId] : null;
        const protocoloFromCaso = deadline.processo_oab_id && !deadline.protocolo_etapa_id
          ? protocolosMap[deadline.processo_oab_id] : null;

        return {
          id: deadline.id,
          title: deadline.title,
          description: deadline.description || '',
          date: safeParseDate(deadline.date),
          projectId: deadline.project_id,
          projectName: deadline.projects?.name || 'Projeto não encontrado',
          clientName: deadline.projects?.client || 'Cliente não encontrado',
          completed: deadline.completed,
          advogadoResponsavel: deadline.advogado ? {
            userId: deadline.advogado.user_id,
            name: deadline.advogado.full_name,
            avatar: deadline.advogado.avatar_url
          } : undefined,
          taggedUsers: (deadline.deadline_tags || [])
            .filter((tag: any) => tag.tagged_user)
            .map((tag: any) => ({
              userId: tag.tagged_user?.user_id,
              name: tag.tagged_user?.full_name || 'Usuário',
              avatar: tag.tagged_user?.avatar_url
            })),
          processoOabId: deadline.processo_oab_id || undefined,
          createdAt: safeParseTimestamp(deadline.created_at),
          updatedAt: safeParseTimestamp(deadline.updated_at),
          // Only show processoOrigem if genuinely linked (not leaked from __currentProcessoOabId)
          processoOrigem: deadline.processo_oab && (!deadline.protocolo_etapa_id || protocoloProcessoOabId === deadline.processo_oab_id) ? {
            id: deadline.processo_oab.id,
            numeroCnj: deadline.processo_oab.numero_cnj,
            parteAtiva: deadline.processo_oab.parte_ativa,
            partePassiva: deadline.processo_oab.parte_passiva,
            tribunal: deadline.processo_oab.tribunal
          } : undefined,
          protocoloOrigem: deadline.protocolo_etapa ? {
            etapaId: deadline.protocolo_etapa.id,
            etapaNome: deadline.protocolo_etapa.nome,
            protocoloNome: deadline.protocolo_etapa.protocolo?.nome,
            projectId: deadline.protocolo_etapa.protocolo?.project_id
          } : undefined,
          casoVinculado: casoFromProtocolo ? {
            id: casoFromProtocolo.id,
            numeroCnj: casoFromProtocolo.numero_cnj,
            parteAtiva: casoFromProtocolo.parte_ativa,
            partePassiva: casoFromProtocolo.parte_passiva,
            tribunal: casoFromProtocolo.tribunal
          } : undefined,
          protocoloVinculado: protocoloFromCaso ? {
            etapaId: '',
            protocoloNome: protocoloFromCaso.nome,
            projectId: protocoloFromCaso.project_id,
            protocoloId: protocoloFromCaso.id
          } : undefined,
          workspaceName: deadline.workspace_id ? workspaceNameMap[deadline.workspace_id] : undefined,
          workspaceId: deadline.workspace_id || undefined,
          protocoloEtapaId: deadline.protocolo_etapa_id || undefined,
          createdByUserId: deadline.user_id || undefined,
          completedByUserId: deadline.concluido_por || undefined,
          createdByName: deadline.user_id ? creatorMap[deadline.user_id]?.full_name : undefined,
          createdByAvatar: deadline.user_id ? creatorMap[deadline.user_id]?.avatar_url || undefined : undefined,
          completedByName: deadline.concluido_por ? creatorMap[deadline.concluido_por]?.full_name : undefined,
          completedByAvatar: deadline.concluido_por ? creatorMap[deadline.concluido_por]?.avatar_url || undefined : undefined,
          comentarioConclusao: deadline.comentario_conclusao || undefined,
          concluidoEm: deadline.concluido_em ? safeParseTimestamp(deadline.concluido_em) : undefined,
          deadlineCategory: deadline.deadline_category || undefined,
          deadlineNumber: (deadline as any).deadline_number || undefined
        };
      });

      setDeadlines(mappedDeadlines);
    } catch (error) {
      console.error('[AgendaContent] Error:', error);
    }
  };

  const fetchAllUsers = async () => {
    if (!tenantId) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name');
    
    if (error) {
      console.error('[AgendaContent] Error fetching users:', error);
      return;
    }
    
    if (data) {
      setAllUsers(data.map(u => ({
        id: u.user_id,
        name: u.full_name || u.email,
        email: u.email
      })));
    }
  };

  // ===== Computed Values =====
  const matchesSearchFilter = (deadline: Deadline) =>
    deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deadline.deadlineNumber && deadline.deadlineNumber.toString().includes(searchTerm));

  const isUserParticipant = (deadline: Deadline, userId: string) =>
    deadline.advogadoResponsavel?.userId === userId ||
    deadline.taggedUsers?.some(t => t.userId === userId) ||
    deadline.createdByUserId === userId ||
    deadline.completedByUserId === userId;

  // For non-completed sections: filter by advogado/tagged only (original behavior)
  const filteredDeadlines = deadlines.filter(deadline => {
    const matchesSearch = matchesSearchFilter(deadline);
    const matchesUser = selectedUserFilter === "all" || 
      deadline.advogadoResponsavel?.userId === selectedUserFilter ||
      deadline.taggedUsers?.some(t => t.userId === selectedUserFilter);
    return matchesSearch && matchesUser;
  });

  // For completed section: use broader participation criteria
  const searchFilteredDeadlines = deadlines.filter(matchesSearchFilter);

  const getDeadlinesForDate = (date: Date) => {
    return filteredDeadlines.filter(deadline => {
      try {
        return isValid(deadline.date) && isSameDay(deadline.date, date);
      } catch {
        return false;
      }
    });
  };

  const getOverdueDeadlines = () => {
    return filteredDeadlines.filter(deadline => {
      try {
        return isValid(deadline.date) && isPast(deadline.date) && !deadline.completed;
      } catch {
        return false;
      }
    });
  };

  const getUpcomingDeadlines = () => {
    return filteredDeadlines.filter(deadline => {
      try {
        return isValid(deadline.date) && isFuture(deadline.date) && !deadline.completed;
      } catch {
        return false;
      }
    });
  };

  const getCompletedDeadlines = () => {
    // Use searchFilteredDeadlines (broader base) instead of filteredDeadlines
    let completed = searchFilteredDeadlines.filter(d => d.completed);

    // Apply user-based participation filter for completed section
    if (!isAdmin) {
      completed = completed.filter(d => user?.id ? isUserParticipant(d, user.id) : false);
    } else if (completedFilterUserId && completedFilterUserId !== 'all') {
      completed = completed.filter(d => isUserParticipant(d, completedFilterUserId));
    }

    // Also respect the global user filter if set (but with expanded criteria)
    if (selectedUserFilter !== "all") {
      completed = completed.filter(d => isUserParticipant(d, selectedUserFilter));
    }
    
    return completed.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };

  // ===== Handlers =====
  const [creatingDeadline, setCreatingDeadline] = useState(false);

  const handleCreateDeadline = async () => {
    if (creatingDeadline) return;
    if (!formData.title.trim() || !user) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título do prazo.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAdvogado) {
      toast({
        title: "Responsável obrigatório",
        description: "Selecione o responsável pelo prazo.",
        variant: "destructive",
      });
      return;
    }

    setCreatingDeadline(true);
    try {
      // Use selected workspace or resolve default
      let resolvedWorkspaceId: string | null = null;
      if (formData.projectId) {
        if (formData.workspaceId) {
          resolvedWorkspaceId = formData.workspaceId;
        } else {
          const { data: defaultWs } = await supabase
            .from('project_workspaces')
            .select('id')
            .eq('project_id', formData.projectId)
            .eq('is_default', true)
            .maybeSingle();
          resolvedWorkspaceId = defaultWs?.id || null;
        }
      }

      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          tenant_id: tenantId,
          title: formData.title,
          description: formData.description,
          date: format(formData.date, 'yyyy-MM-dd'),
          project_id: formData.projectId || null,
          advogado_responsavel_id: selectedAdvogado,
          module,
          workspace_id: resolvedWorkspaceId,
          processo_oab_id: selectedProtocoloId ? (availableProtocolos.find(p => p.id === selectedProtocoloId)?.processo_oab_id || null) : null,
          protocolo_etapa_id: selectedEtapaId || null
        })
        .select()
        .single();

      if (error) {
        console.error('[AgendaContent] Error creating deadline:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o prazo.",
          variant: "destructive",
        });
        return;
      }

      if (taggedUsers.length > 0) {
        const tags = taggedUsers.map(userId => ({
          deadline_id: data.id,
          tagged_user_id: userId,
          tenant_id: tenantId
        }));

        await supabase.from('deadline_tags').insert(tags);
      }

      if (tenantId) {
        await notifyDeadlineAssigned(
          data.id,
          formData.title,
          selectedAdvogado,
          user.id,
          tenantId,
          formData.projectId
        );

        if (taggedUsers.length > 0) {
          await notifyDeadlineTagged(
            data.id,
            formData.title,
            taggedUsers,
            user.id,
            tenantId,
            formData.projectId
          );
        }
      }

      await fetchDeadlinesAsync();

      setFormData({ title: "", description: "", date: selectedDate, projectId: "", workspaceId: "" });
      setAvailableWorkspaces([]);
      setAvailableProtocolos([]);
      setSelectedProtocoloId("");
      setAvailableEtapas([]);
      setSelectedEtapaId("");
      setSelectedAdvogado(null);
      setTaggedUsers([]);
      setIsDialogOpen(false);

      toast({
        title: "Prazo criado",
        description: "Novo prazo adicionado à agenda com sucesso.",
      });
    } catch (error) {
      console.error('[AgendaContent] Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar prazo.",
        variant: "destructive",
      });
    } finally {
      setCreatingDeadline(false);
    }
  };

  const toggleDeadlineCompletion = async (deadlineId: string) => {
    try {
      const deadline = deadlines.find(d => d.id === deadlineId);
      if (!deadline) return;

      const { error } = await supabase
        .from('deadlines')
        .update({ completed: !deadline.completed })
        .eq('id', deadlineId);

      if (error) {
        console.error('Error updating deadline:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do prazo.",
          variant: "destructive",
        });
        return;
      }

      setDeadlines(deadlines.map(d =>
        d.id === deadlineId ? { ...d, completed: !d.completed, updatedAt: new Date() } : d
      ));

      toast({
        title: "Status atualizado",
        description: "Status do prazo foi alterado com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar prazo.",
        variant: "destructive",
      });
    }
  };

  const createClientHistory = async (deadline: Deadline, actionType: string) => {
    if (!user) return;
    try {
      await supabase
        .from('client_history')
        .insert({
          user_id: user.id,
          project_id: deadline.projectId,
          client_name: deadline.clientName,
          action_type: actionType,
          title: deadline.title,
          description: deadline.description
        });
    } catch (error) {
      console.error('Error creating client history:', error);
    }
  };

  const handleConfirmComplete = async () => {
    if (!confirmCompleteDeadlineId || !comentarioConclusao.trim()) return;
    
    const deadline = deadlines.find(d => d.id === confirmCompleteDeadlineId);
    if (!deadline) return;
    
    try {
      const { error } = await supabase
        .from('deadlines')
        .update({ 
          completed: true,
          comentario_conclusao: comentarioConclusao.trim(),
          concluido_por: user?.id,
          concluido_em: new Date().toISOString()
        })
        .eq('id', confirmCompleteDeadlineId);

      if (error) {
        console.error('Error completing deadline:', error);
        toast({
          title: "Erro",
          description: "Não foi possível concluir o prazo.",
          variant: "destructive",
        });
        return;
      }

      const completionData = {
        completed: true,
        updatedAt: new Date(),
        completedByUserId: user?.id,
        completedByName: user?.user_metadata?.full_name || user?.email || undefined,
        completedByAvatar: user?.user_metadata?.avatar_url || undefined,
        comentarioConclusao: comentarioConclusao.trim(),
        concluidoEm: new Date(),
      };

      setDeadlines(deadlines.map(d =>
        d.id === confirmCompleteDeadlineId
          ? { ...d, ...completionData }
          : d
      ));

      if (selectedDeadline?.id === confirmCompleteDeadlineId) {
        setSelectedDeadline({ ...selectedDeadline, ...completionData });
      }

      await createClientHistory(deadline, 'deadline_completed');

      // Create subtarefa if checkbox was marked
      if (criarSubtarefa && subtarefaDescricao.trim()) {
        await supabase
          .from('deadline_subtarefas')
          .insert({
            deadline_id: confirmCompleteDeadlineId,
            descricao: subtarefaDescricao.trim(),
            criado_por: user?.id,
            tenant_id: tenantId
          });
      }
      
      setConfirmCompleteDeadlineId(null);
      setComentarioConclusao("");
      setCriarSubtarefa(false);
      setSubtarefaDescricao("");
      setIsDetailDialogOpen(false);
      
      toast({
        title: "Prazo concluído",
        description: "Prazo marcado como concluído com comentário registrado.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao concluir prazo.",
        variant: "destructive",
      });
    }
  };

  const openDeadlineDetails = (deadline: Deadline) => {
    setSelectedDeadline(deadline);
    setIsDetailDialogOpen(true);
  };

  const openExtendDialog = (deadline: Deadline) => {
    setExtendDeadline(deadline);
    setNovaDataExtensao(undefined);
    setMotivoExtensao("");
    setIsExtendDialogOpen(true);
  };

  const handleExtenderPrazo = async () => {
    if (!extendDeadline || !novaDataExtensao || !motivoExtensao.trim()) return;
    
    setSalvandoExtensao(true);
    try {
      const dataOriginal = extendDeadline.date;
      
      const { error } = await supabase
        .from('deadlines')
        .update({ 
          date: format(novaDataExtensao, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', extendDeadline.id);
      
      if (error) throw error;
      
      await supabase
        .from('deadline_comentarios')
        .insert({
          deadline_id: extendDeadline.id,
          user_id: user?.id,
          comentario: `📅 Prazo estendido de ${format(dataOriginal, 'dd/MM/yyyy')} para ${format(novaDataExtensao, 'dd/MM/yyyy')}\n\nMotivo: ${motivoExtensao}`,
          tenant_id: tenantId
        });
      
      toast({
        title: "Prazo estendido",
        description: "A nova data do prazo foi registrada com sucesso.",
      });
      
      setIsExtendDialogOpen(false);
      setExtendDeadline(null);
      setNovaDataExtensao(undefined);
      setMotivoExtensao("");
      
      await fetchDeadlinesAsync();
      
    } catch (error) {
      console.error('Erro ao estender prazo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível estender o prazo.",
        variant: "destructive",
      });
    } finally {
      setSalvandoExtensao(false);
    }
  };

  const handleDeleteDeadline = async (deadlineId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('deadlines')
        .delete()
        .eq('id', deadlineId);

      if (error) {
        console.error('Error deleting deadline:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o prazo.",
          variant: "destructive",
        });
        return;
      }

      setDeadlines(deadlines.filter(d => d.id !== deadlineId));
      setIsDetailDialogOpen(false);

      toast({
        title: "Prazo excluído",
        description: "Prazo foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir prazo.",
        variant: "destructive",
      });
    }
  };

  const handleReopenDeadline = async () => {
    if (!reopenDeadlineId || !reopenMotivo.trim() || !user) return;
    try {
      const { error } = await supabase
        .from('deadlines')
        .update({
          completed: false,
          concluido_por: null,
          concluido_em: null,
          comentario_conclusao: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reopenDeadlineId);

      if (error) throw error;

      // Get user name for comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('deadline_comentarios')
        .insert({
          deadline_id: reopenDeadlineId,
          user_id: user.id,
          comentario: `🔄 Prazo reaberto por ${profile?.full_name || 'Usuário'}\n\nMotivo: ${reopenMotivo.trim()}`,
          tenant_id: tenantId
        });

      toast({
        title: "Prazo reaberto",
        description: "O prazo foi marcado como pendente novamente.",
      });

      setReopenDeadlineId(null);
      setReopenMotivo("");
      setIsDetailDialogOpen(false);
      await fetchDeadlinesAsync();
    } catch (error) {
      console.error('Erro ao reabrir prazo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reabrir o prazo.",
        variant: "destructive",
      });
    }
  };

  const DeadlineRow = ({ deadline }: { deadline: Deadline }) => {
    const isOverdue = !deadline.completed && safeIsPast(deadline.date);
    const statusColor = deadline.completed 
      ? "bg-primary" 
      : isOverdue 
        ? "bg-destructive" 
        : "bg-muted-foreground/50";

    return (
      <div
        className="border rounded-lg p-2.5 md:p-3 hover:bg-muted/30 transition-colors cursor-pointer flex items-center gap-2 md:gap-3"
        onClick={() => openDeadlineDetails(deadline)}
      >
        {/* Status dot */}
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusColor)} />
        
        {/* Title + project + date on mobile */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            deadline.completed && "line-through text-muted-foreground"
          )}>
            {deadline.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">{deadline.projectName}</span>
            {deadline.advogadoResponsavel && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={deadline.advogadoResponsavel.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {deadline.advogadoResponsavel.name?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            {/* Date inline on mobile */}
            <span className="text-xs text-muted-foreground whitespace-nowrap md:hidden">
              · {safeFormatDate(deadline.date, "dd/MM")}
            </span>
          </div>
        </div>

        {/* Date - hidden on mobile (shown inline above) */}
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
          {safeFormatDate(deadline.date)}
        </span>

        {/* Status badge - hidden on mobile */}
        <Badge 
          variant={deadline.completed ? "default" : isOverdue ? "destructive" : "secondary"}
          className="text-xs shrink-0 hidden md:inline-flex"
        >
          {deadline.completed ? "Concluído" : isOverdue ? "Vencido" : "Pendente"}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!deadline.completed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              onClick={() => setConfirmCompleteDeadlineId(deadline.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {deadline.completed ? (
                <>
                  <DropdownMenuItem onClick={() => setReopenDeadlineId(deadline.id)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Marcar como Pendente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditDialog(deadline)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Prazo
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => openEditDialog(deadline)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Prazo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExtendDialog(deadline)}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Estender Prazo
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // ===== Render =====
  return (
    <div className="space-y-4">
      {/* User Filter + Search + New button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden md:block">Visualizando prazos de:</label>
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative max-w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar prazos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open && tenantId) {
            supabase
              .from('projects')
              .select('id, name, client')
              .eq('tenant_id', tenantId)
              .order('name')
              .then(({ data }) => setAvailableProjects(data || []));
            // Load all tenant protocolos by default (no project filter)
            supabase
              .from('project_protocolos')
              .select('id, nome, processo_oab_id')
              .eq('tenant_id', tenantId)
              .order('nome')
              .then(({ data }) => setAvailableProtocolos(data || []));
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 w-full md:w-auto">
              <Plus size={16} />
              Novo Prazo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar Novo Prazo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Digite o título do prazo"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva o prazo"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <AdvogadoSelector 
                  value={selectedAdvogado} 
                  onChange={setSelectedAdvogado}
                />
              </div>
              <div>
                <UserTagSelector
                  selectedUsers={taggedUsers}
                  onChange={setTaggedUsers}
                  excludeCurrentUser
                />
              </div>
              <div>
                <label className="text-sm font-medium">Projeto (opcional)</label>
                <Select 
                  value={formData.projectId || "none"} 
                  onValueChange={async (val) => {
                    const projectId = val === "none" ? "" : val;
                    setFormData({ ...formData, projectId, workspaceId: "" });
                    setAvailableWorkspaces([]);
                    setAvailableProtocolos([]);
                    setSelectedProtocoloId("");
                    setAvailableEtapas([]);
                    setSelectedEtapaId("");
                    if (projectId) {
                      const { data: ws } = await supabase
                        .from('project_workspaces')
                        .select('id, nome')
                        .eq('project_id', projectId)
                        .order('is_default', { ascending: false });
                      setAvailableWorkspaces(ws || []);
                      // Load protocolos linked to this project
                      const { data: prots } = await supabase
                        .from('project_protocolos')
                        .select('id, nome, processo_oab_id')
                        .eq('project_id', projectId)
                        .order('nome');
                      setAvailableProtocolos(prots || []);
                    } else if (tenantId) {
                      // No project selected: load all tenant protocolos
                      const { data: allProts } = await supabase
                        .from('project_protocolos')
                        .select('id, nome, processo_oab_id')
                        .eq('tenant_id', tenantId)
                        .order('nome');
                      setAvailableProtocolos(allProts || []);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem projeto</SelectItem>
                    {availableProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.projectId && availableWorkspaces.length > 1 && (
                <div>
                  <label className="text-sm font-medium">Workspace (opcional)</label>
                  <Select 
                    value={formData.workspaceId || "default"} 
                    onValueChange={(val) => setFormData({ ...formData, workspaceId: val === "default" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Workspace padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Workspace padrão</SelectItem>
                      {availableWorkspaces.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {availableProtocolos.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Protocolo (opcional)</label>
                  <Select
                    value={selectedProtocoloId || "none"}
                    onValueChange={async (val) => {
                      const protId = val === "none" ? "" : val;
                      setSelectedProtocoloId(protId);
                      setSelectedEtapaId("");
                      setAvailableEtapas([]);
                      if (protId) {
                        const { data: etapas } = await supabase
                          .from('project_protocolo_etapas')
                          .select('id, nome')
                          .eq('protocolo_id', protId)
                          .order('ordem');
                        setAvailableEtapas((etapas || []).map(e => ({
                          id: e.id,
                          nome: e.nome,
                          protocolo_nome: null
                        })));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem protocolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem protocolo</SelectItem>
                      {availableProtocolos.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedProtocoloId && availableEtapas.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Etapa (opcional)</label>
                  <Select
                    value={selectedEtapaId || "none"}
                    onValueChange={(val) => setSelectedEtapaId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem etapa</SelectItem>
                      {availableEtapas.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      className="pointer-events-auto"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={handleCreateDeadline} className="w-full" disabled={creatingDeadline}>
                {creatingDeadline ? <Clock className="h-4 w-4 animate-spin mr-2" /> : null}
                {creatingDeadline ? "Criando..." : "Criar Prazo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-column layout: Calendar + List */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Calendar - Left: hidden on mobile (toggle), visible md+ */}
        <div className="hidden md:block lg:w-[670px] xl:w-[750px] shrink-0">
          <div className="border rounded-lg p-4 bg-card">
            <AgendaCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              deadlines={filteredDeadlines}
            />
          </div>
        </div>

        {/* Minimalist List - Right */}
        <div className="flex-1 space-y-4">

          {/* Mobile calendar toggle */}
          <div className="md:hidden">
            <button
              className="flex items-center gap-2 text-sm font-medium text-primary py-1 w-full"
              onClick={() => setShowMobileCalendar(v => !v)}
            >
              <CalendarIcon className="h-4 w-4" />
              {showMobileCalendar ? "Ocultar calendário" : "Ver calendário"}
              <ChevronDown className={cn("h-4 w-4 transition-transform ml-auto", showMobileCalendar && "rotate-180")} />
            </button>
            {showMobileCalendar && (
              <div className="border rounded-lg p-3 bg-card mt-2 mb-1">
                <AgendaCalendar
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setShowMobileCalendar(false);
                  }}
                  deadlines={filteredDeadlines}
                  compact
                />
              </div>
            )}
          </div>

          {/* Selected Date Section - always visible */}
          {(() => {
            const forDate = getDeadlinesForDate(selectedDate).filter(d => !d.completed);
            return (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  {forDate.length > 0 && ` (${forDate.length})`}
                </h4>
                {forDate.length > 0 ? (
                  <div className="max-h-[312px] overflow-y-auto space-y-2 pr-2">
                    {forDate.map((deadline) => (
                      <DeadlineRow key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Nenhum prazo para esta data</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Collapsible sections - clickable text labels */}
          <div className="flex items-center gap-4 border-t pt-3">
            {(() => {
              const overdue = getOverdueDeadlines().filter(d => !isSameDay(d.date, selectedDate));
              const upcoming = getUpcomingDeadlines().filter(d => !isSameDay(d.date, selectedDate));
              const completed = getCompletedDeadlines();
              return (
                <>
                  {overdue.length > 0 && (
                    <span
                      className={cn(
                        "text-sm cursor-pointer transition-colors select-none",
                        activeSection === "overdue"
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveSection(activeSection === "overdue" ? null : "overdue")}
                    >
                      Vencidos ({overdue.length})
                    </span>
                  )}
                  {upcoming.length > 0 && (
                    <span
                      className={cn(
                        "text-sm cursor-pointer transition-colors select-none",
                        activeSection === "upcoming"
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveSection(activeSection === "upcoming" ? null : "upcoming")}
                    >
                      Próximos ({upcoming.length})
                    </span>
                  )}
                  {completed.length > 0 && (
                    <span
                      className={cn(
                        "text-sm cursor-pointer transition-colors select-none",
                        activeSection === "completed"
                          ? "font-semibold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveSection(activeSection === "completed" ? null : "completed")}
                    >
                      Concluídos ({completed.length})
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Expandable Overdue section */}
          {activeSection === "overdue" && (() => {
            const overdue = getOverdueDeadlines().filter(d => !isSameDay(d.date, selectedDate));
            return overdue.length > 0 ? (
              <div className="max-h-[312px] overflow-y-auto space-y-2 pr-2">
                {overdue.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </div>
            ) : null;
          })()}

          {/* Expandable Upcoming section */}
          {activeSection === "upcoming" && (() => {
            const upcoming = getUpcomingDeadlines().filter(d => !isSameDay(d.date, selectedDate));
            return upcoming.length > 0 ? (
              <div className="max-h-[312px] overflow-y-auto space-y-2 pr-2">
                {upcoming.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </div>
            ) : null;
          })()}

          {/* Expandable Completed section */}
          {activeSection === "completed" && (() => {
            const completed = getCompletedDeadlines();
            return completed.length > 0 ? (
              <div className="max-h-[312px] overflow-y-auto space-y-2 pr-2">
                {completed.map((deadline) => (
                  <DeadlineRow key={deadline.id} deadline={deadline} />
                ))}
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Deadline Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedDeadline && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDeadline.title}</DialogTitle>
                {selectedDeadline.deadlineNumber && (
                  <p className="text-xs text-muted-foreground">Prazo nº {selectedDeadline.deadlineNumber}</p>
                )}
              </DialogHeader>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className={cn("grid w-full", selectedDeadline.completed ? "grid-cols-3" : "grid-cols-2")}>
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  {selectedDeadline.completed && (
                    <TabsTrigger value="conclusao">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Conclusão
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-foreground">{selectedDeadline.description || 'Sem descrição'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data</label>
                      <p className="text-foreground">{safeFormatDate(selectedDeadline.date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Projeto</label>
                      <p className="text-foreground">{selectedDeadline.projectName}</p>
                    </div>
                  </div>
                  {selectedDeadline.workspaceName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Workspace</label>
                      <p className="text-foreground">{selectedDeadline.workspaceName}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                    <p className="text-foreground">{selectedDeadline.clientName}</p>
                  </div>
                  
                  {selectedDeadline.advogadoResponsavel && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Advogado Responsável</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedDeadline.advogadoResponsavel.avatar} />
                          <AvatarFallback className="text-xs">
                            {selectedDeadline.advogadoResponsavel.name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedDeadline.advogadoResponsavel.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {selectedDeadline.taggedUsers && selectedDeadline.taggedUsers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Usuários Marcados</label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {selectedDeadline.taggedUsers.map((tagged, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={tagged.avatar} />
                              <AvatarFallback className="text-xs">
                                {tagged.name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{tagged.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Origem e Vinculado - Abas estilo Extras */}
                  {(selectedDeadline.processoOrigem || selectedDeadline.protocoloOrigem) && (() => {
                    const hasVinculado = !!(selectedDeadline.casoVinculado || selectedDeadline.protocoloVinculado);
                    const origemLabel = selectedDeadline.processoOrigem ? "Processo Judicial" : "Processo de Origem";
                    const vinculadoLabel = selectedDeadline.casoVinculado ? "Caso Vinculado" : "Processo Vinculado";
                    
                    return (
                      <OriginTabs
                        hasVinculado={hasVinculado}
                        origemLabel={origemLabel}
                        vinculadoLabel={vinculadoLabel}
                        selectedDeadline={selectedDeadline}
                        onViewProcesso={async (processoId: string) => {
                          const { data } = await supabase
                            .from('processos_oab')
                            .select('*')
                            .eq('id', processoId)
                            .single();
                          if (data) {
                            setSelectedProcessoOAB(data as unknown as ProcessoOAB);
                            setProcessoDrawerOpen(true);
                          }
                        }}
                        onNavigateProject={(projectId: string) => {
                          const base = tenantSlug ? `/${tenantSlug}` : '';
                          window.open(`${base}/project/${projectId}?clearDrawer=true`, '_blank');
                        }}
                      />
                    );
                  })()}
                  
                  {selectedDeadline.createdByName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Criado por</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedDeadline.createdByAvatar} />
                          <AvatarFallback className="text-xs">
                            {selectedDeadline.createdByName?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedDeadline.createdByName}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge 
                      variant={selectedDeadline.completed ? "default" : safeIsPast(selectedDeadline.date) ? "destructive" : "secondary"}
                      className="ml-2"
                    >
                      {selectedDeadline.completed ? "Concluído" : safeIsPast(selectedDeadline.date) ? "Atrasado" : "Pendente"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    {!selectedDeadline.completed ? (
                      <Button 
                        onClick={() => setConfirmCompleteDeadlineId(selectedDeadline.id)}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Concluído
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => setReopenDeadlineId(selectedDeadline.id)}
                        className="flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Marcar como Pendente
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(selectedDeadline)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir prazo
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Prazo</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este prazo? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteDeadline(selectedDeadline.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TabsContent>
                {selectedDeadline.completed && (
                  <TabsContent value="conclusao" className="space-y-4 mt-4">
                    {selectedDeadline.comentarioConclusao ? (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Comentário de Conclusão</label>
                        <p className="text-foreground mt-1 whitespace-pre-wrap">{selectedDeadline.comentarioConclusao}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum comentário de conclusão registrado.</p>
                    )}
                    {selectedDeadline.completedByName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Concluído por</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedDeadline.completedByAvatar} />
                            <AvatarFallback className="text-xs">{selectedDeadline.completedByName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <span>{selectedDeadline.completedByName}</span>
                        </div>
                      </div>
                    )}
                    {selectedDeadline.concluidoEm && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Conclusão</label>
                        <p className="text-foreground">{safeFormatDate(selectedDeadline.concluidoEm, "dd/MM/yyyy 'às' HH:mm")}</p>
                      </div>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="comments" className="mt-4">
                  <DeadlineComentarios deadlineId={selectedDeadline.id} currentUserId={user?.id || ''} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação para concluir prazo */}
      <AlertDialog 
        open={!!confirmCompleteDeadlineId} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmCompleteDeadlineId(null);
            setComentarioConclusao("");
            setCriarSubtarefa(false);
            setSubtarefaDescricao("");
            
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conclusão do Prazo</AlertDialogTitle>
            <AlertDialogDescription>
              Descreva o que foi realizado para concluir este prazo.
              Este comentário ficará registrado para conferência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium">Comentário de Conclusão *</label>
            <Textarea
              value={comentarioConclusao}
              onChange={(e) => setComentarioConclusao(e.target.value)}
              placeholder="Descreva o que foi realizado para concluir este prazo..."
              rows={4}
              className="mt-2"
            />
            {!comentarioConclusao.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                O comentário é obrigatório para concluir o prazo.
              </p>
            )}
          </div>

          {/* Subtarefa checkbox */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="criar-subtarefa"
                checked={criarSubtarefa}
                onCheckedChange={(checked) => setCriarSubtarefa(checked === true)}
              />
              <label htmlFor="criar-subtarefa" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-500" />
                Criar subtarefa
              </label>
            </div>
            {criarSubtarefa && (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <label className="text-sm font-medium">Descrição da subtarefa</label>
                  <Textarea
                    value={subtarefaDescricao}
                    onChange={(e) => setSubtarefaDescricao(e.target.value)}
                    placeholder="Descreva a subtarefa..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmComplete}
              disabled={!comentarioConclusao.trim() || (criarSubtarefa && !subtarefaDescricao.trim())}
            >
              Confirmar Conclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Estender Prazo */}
      <Dialog open={isExtendDialogOpen} onOpenChange={(open) => {
        setIsExtendDialogOpen(open);
        if (!open) {
          setExtendDeadline(null);
          setNovaDataExtensao(undefined);
          setMotivoExtensao("");
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Estender Prazo
            </DialogTitle>
          </DialogHeader>
          
          {extendDeadline && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{extendDeadline.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data atual: {safeFormatDate(extendDeadline.date)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Nova Data *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !novaDataExtensao && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {novaDataExtensao 
                        ? format(novaDataExtensao, "dd/MM/yyyy", { locale: ptBR }) 
                        : "Selecionar nova data"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={novaDataExtensao}
                      onSelect={setNovaDataExtensao}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium">Motivo da Extensão *</label>
                <Textarea
                  value={motivoExtensao}
                  onChange={(e) => setMotivoExtensao(e.target.value)}
                  placeholder="Descreva o motivo da extensão do prazo..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsExtendDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleExtenderPrazo}
                  disabled={!novaDataExtensao || !motivoExtensao.trim() || salvandoExtensao}
                >
                  {salvandoExtensao ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de reabertura de prazo */}
      <AlertDialog 
        open={!!reopenDeadlineId} 
        onOpenChange={(open) => {
          if (!open) {
            setReopenDeadlineId(null);
            setReopenMotivo("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reabrir Prazo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Descreva o motivo para reabrir este prazo. O comentário será registrado no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Motivo da reabertura *</label>
            <Textarea
              value={reopenMotivo}
              onChange={(e) => setReopenMotivo(e.target.value)}
              placeholder="Descreva o motivo para reabrir este prazo..."
              rows={4}
              className="mt-2"
            />
            {!reopenMotivo.trim() && (
              <p className="text-xs text-muted-foreground mt-1">O motivo é obrigatório para reabrir o prazo.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenDeadline} disabled={!reopenMotivo.trim()}>
              Confirmar Reabertura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição de Prazo */}
      <EditarPrazoDialog
        deadline={editDeadline}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          fetchDeadlinesAsync();
          setEditDeadline(null);
        }}
        tenantId={tenantId || ''}
      />

      {/* Drawer do Processo OAB */}
      <ProcessoOABDetalhes
        processo={selectedProcessoOAB}
        open={processoDrawerOpen}
        onOpenChange={setProcessoDrawerOpen}
        onToggleMonitoramento={async (p) => {
          const result = await toggleMonitoramento(p);
          if (result && selectedProcessoOAB) {
            setSelectedProcessoOAB({
              ...selectedProcessoOAB,
              monitoramento_ativo: !selectedProcessoOAB.monitoramento_ativo
            });
          }
          return result;
        }}
      />
    </div>
  );
}
