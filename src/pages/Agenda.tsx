import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import AgendaCalendar from "@/components/Agenda/AgendaCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ArrowLeft, Trash2, UserCheck, MessageSquare, Info, Scale, FileText, ExternalLink, MoreVertical, CalendarClock, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeadlineComentarios } from "@/components/Agenda/DeadlineComentarios";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "@/components/Agenda/UserTagSelector";
import EditarPrazoDialog from "@/components/Agenda/EditarPrazoDialog";
import { Project } from "@/types/project";
import { Deadline, DeadlineFormData } from "@/types/agenda";
import { format, isSameDay, isPast, isFuture, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { useTenantId } from "@/hooks/useTenantId";
import { useNavigationLoading } from "@/contexts/NavigationLoadingContext";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { notifyDeadlineAssigned, notifyDeadlineTagged } from "@/utils/notificationHelpers";

const Agenda = () => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();
  const { stopLoading, navigationId } = useNavigationLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [formData, setFormData] = useState<DeadlineFormData>({
    title: "",
    description: "",
    date: new Date(),
    projectId: ""
  });
  const [processoOabIdForDeadline, setProcessoOabIdForDeadline] = useState<string | null>(null);
  const [processoNumeroForDeadline, setProcessoNumeroForDeadline] = useState<string>("");
  const [selectedAdvogado, setSelectedAdvogado] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [filteredUserId, setFilteredUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filteredUserDeadlines, setFilteredUserDeadlines] = useState<Deadline[]>([]);
  const [completedFilterUserId, setCompletedFilterUserId] = useState<string | null>(null);
  const [confirmCompleteDeadlineId, setConfirmCompleteDeadlineId] = useState<string | null>(null);
  const [comentarioConclusao, setComentarioConclusao] = useState("");
  
  // Estado para modal de extensão de prazo
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [extendDeadline, setExtendDeadline] = useState<Deadline | null>(null);
  const [novaDataExtensao, setNovaDataExtensao] = useState<Date | undefined>(undefined);
  const [motivoExtensao, setMotivoExtensao] = useState("");
  const [salvandoExtensao, setSalvandoExtensao] = useState(false);
  
  // Estado para modal de edição de prazo
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDeadline, setEditDeadline] = useState<Deadline | null>(null);
  
  const { toast } = useToast();

  // Funcao helper para parsear data com seguranca
  const safeParseDate = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    try {
      const parsed = parseISO(dateString + 'T12:00:00');
      if (!isValid(parsed)) {
        console.warn('[Agenda] Invalid date:', dateString);
        return new Date();
      }
      return parsed;
    } catch (error) {
      console.warn('[Agenda] Error parsing date:', dateString, error);
      return new Date();
    }
  };

  // Helper para formatacao segura de data
  const safeFormatDate = (date: Date, formatStr: string = "dd/MM/yyyy"): string => {
    try {
      if (!isValid(date)) return "Data invalida";
      return format(date, formatStr, { locale: ptBR });
    } catch {
      return "Data invalida";
    }
  };

  // Helper para verificacao segura de isPast
  const safeIsPast = (date: Date): boolean => {
    try {
      return isValid(date) && isPast(date);
    } catch {
      return false;
    }
  };

  // Helper para parsear timestamp com seguranca (created_at, updated_at)
  const safeParseTimestamp = (timestamp: string | null | undefined): Date => {
    if (!timestamp) return new Date();
    try {
      const parsed = new Date(timestamp);
      return isValid(parsed) ? parsed : new Date();
    } catch {
      return new Date();
    }
  };

  // Verificar se veio da aba Tarefas com params para criar prazo
  useEffect(() => {
    const criarPrazo = searchParams.get('criarPrazo');
    if (criarPrazo === 'true') {
      const titulo = searchParams.get('titulo') || '';
      const descricao = searchParams.get('descricao') || '';
      const processoOabId = searchParams.get('processoOabId') || null;
      const processoNumero = searchParams.get('processoNumero') || '';
      
      setFormData(prev => ({
        ...prev,
        title: titulo,
        description: descricao,
      }));
      setProcessoOabIdForDeadline(processoOabId);
      setProcessoNumeroForDeadline(processoNumero);
      setIsDialogOpen(true);
      
      // Limpar params da URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const navId = navigationId;
    const loadInitialData = async () => {
      if (!user) {
        stopLoading(navId);
        return;
      }
      
      // Carregar projects, deadlines e admin status em paralelo
      const [projectsPromise, deadlinesPromise, adminPromise] = await Promise.all([
        fetchProjectsAsync(),
        fetchDeadlinesAsync(),
        checkIfUserIsAdminOrController(user.id)
      ]);
      
      setIsAdmin(adminPromise);
      // Sinalizar que a página está pronta
      stopLoading(navId);
    };
    
    loadInitialData();
  }, [user]);

  // State for user filter (default: current user)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

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

  const fetchProjectsAsync = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      const mappedProjects: Project[] = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        client: project.client,
        description: project.description || '',
        tasks: [],
        acordoTasks: [],
        createdBy: project.created_by,
        createdAt: safeParseTimestamp(project.created_at),
        updatedAt: safeParseTimestamp(project.updated_at)
      }));

      setProjects(mappedProjects);
      return mappedProjects;
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  const fetchDeadlinesAsync = async () => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select(`
          *,
          projects (
            name,
            client
          ),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (
            user_id,
            full_name,
            avatar_url
          ),
          deadline_tags (
            tagged_user_id,
            tagged_user:profiles!deadline_tags_tagged_user_id_fkey (
              user_id,
              full_name,
              avatar_url
            )
          ),
          processo_oab:processos_oab (
            id,
            numero_cnj,
            parte_ativa,
            parte_passiva,
            tribunal
          ),
          protocolo_etapa:project_protocolo_etapas (
            id,
            nome,
            protocolo:project_protocolos (
              nome,
              project_id
            )
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('[Agenda] Error fetching deadlines:', error);
        return;
      }

      const mappedDeadlines: Deadline[] = (data || []).map(deadline => ({
        id: deadline.id,
        title: deadline.title,
        description: deadline.description || '',
        date: safeParseDate(deadline.date),
        projectId: deadline.project_id,
        projectName: deadline.projects?.name || 'Projeto nao encontrado',
        clientName: deadline.projects?.client || 'Cliente nao encontrado',
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
            name: tag.tagged_user?.full_name || 'Usuario',
            avatar: tag.tagged_user?.avatar_url
          })),
        processoOabId: deadline.processo_oab_id || undefined,
        createdAt: safeParseTimestamp(deadline.created_at),
        updatedAt: safeParseTimestamp(deadline.updated_at),
        // Origem: Processo Judicial
        processoOrigem: deadline.processo_oab ? {
          id: deadline.processo_oab.id,
          numeroCnj: deadline.processo_oab.numero_cnj,
          parteAtiva: deadline.processo_oab.parte_ativa,
          partePassiva: deadline.processo_oab.parte_passiva,
          tribunal: deadline.processo_oab.tribunal
        } : undefined,
        // Origem: Protocolo/Etapa
        protocoloOrigem: deadline.protocolo_etapa ? {
          etapaId: deadline.protocolo_etapa.id,
          etapaNome: deadline.protocolo_etapa.nome,
          protocoloNome: deadline.protocolo_etapa.protocolo?.nome,
          projectId: deadline.protocolo_etapa.protocolo?.project_id
        } : undefined
      }));

      setDeadlines(mappedDeadlines);
      return mappedDeadlines;
    } catch (error) {
      console.error('[Agenda] Error:', error);
      return [];
    }
  };

  // Mantém a função original para refresh manual
  const fetchProjects = () => fetchProjectsAsync();
  const fetchDeadlines = () => fetchDeadlinesAsync();

  const filteredDeadlines = deadlines.filter(deadline => {
    // Text search filter
    const matchesSearch = 
      deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deadline.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deadline.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deadline.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // User filter
    const matchesUser = selectedUserFilter === "all" || 
      deadline.advogadoResponsavel?.userId === selectedUserFilter ||
      deadline.taggedUsers?.some(t => t.userId === selectedUserFilter);
    
    return matchesSearch && matchesUser;
  });

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

  // Prazos cumpridos - visibilidade por role
  const getCompletedDeadlines = () => {
    let completed = filteredDeadlines.filter(d => d.completed);
    
    // Se nao for admin, filtra apenas os do usuario
    if (!isAdmin) {
      completed = completed.filter(d => 
        d.advogadoResponsavel?.userId === user?.id ||
        d.taggedUsers?.some(t => t.userId === user?.id)
      );
    } else if (completedFilterUserId && completedFilterUserId !== 'all') {
      // Admin com filtro por usuario
      completed = completed.filter(d =>
        d.advogadoResponsavel?.userId === completedFilterUserId ||
        d.taggedUsers?.some(t => t.userId === completedFilterUserId)
      );
    }
    
    // Ordenar por updatedAt (data de conclusao) decrescente
    return completed.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  };

  const handleCreateDeadline = async () => {
    if (!formData.title.trim() || !user) {
      toast({
        title: "Campos obrigatorios",
        description: "Preencha o título do prazo.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAdvogado) {
      toast({
        title: "Responsavel obrigatorio",
        description: "Selecione o responsável pelo prazo.",
        variant: "destructive",
      });
      return;
    }

    try {
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
          processo_oab_id: processoOabIdForDeadline
        })
        .select(`
          *,
          projects (
            name,
            client
          ),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (
            user_id,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('[Agenda] Error creating deadline:', error);
        toast({
          title: "Erro",
          description: "Nao foi possivel criar o prazo.",
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

        const { error: tagsError } = await supabase
          .from('deadline_tags')
          .insert(tags);

        if (tagsError) {
          console.error('[Agenda] Error creating tags:', tagsError);
        }
      }

      // Send notifications
      if (tenantId) {
        // Notify responsible user
        await notifyDeadlineAssigned(
          data.id,
          formData.title,
          selectedAdvogado,
          user.id,
          tenantId,
          formData.projectId
        );

        // Notify tagged users
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

      await fetchDeadlines();

      setFormData({
        title: "",
        description: "",
        date: selectedDate,
        projectId: ""
      });
      setSelectedAdvogado(null);
      setTaggedUsers([]);
      setProcessoOabIdForDeadline(null);
      setProcessoNumeroForDeadline("");
      setIsDialogOpen(false);

      toast({
        title: "Prazo criado",
        description: processoOabIdForDeadline 
          ? "Prazo criado e vinculado ao processo."
          : taggedUsers.length > 0 
            ? `Prazo criado e ${taggedUsers.length} usuario(s) foram marcados.`
            : "Novo prazo adicionado a agenda com sucesso.",
      });
    } catch (error) {
      console.error('[Agenda] Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar prazo.",
        variant: "destructive",
      });
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
          description: "Nao foi possivel atualizar o status do prazo.",
          variant: "destructive",
        });
        return;
      }

      setDeadlines(deadlines.map(d =>
        d.id === deadlineId
          ? { ...d, completed: !d.completed, updatedAt: new Date() }
          : d
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

      setDeadlines(deadlines.map(d =>
        d.id === confirmCompleteDeadlineId
          ? { ...d, completed: true, updatedAt: new Date() }
          : d
      ));

      await createClientHistory(deadline, 'deadline_completed');
      
      setConfirmCompleteDeadlineId(null);
      setComentarioConclusao("");
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

  // Função para abrir dialog de extensão de prazo
  const openExtendDialog = (deadline: Deadline) => {
    setExtendDeadline(deadline);
    setNovaDataExtensao(undefined);
    setMotivoExtensao("");
    setIsExtendDialogOpen(true);
  };

  // Função para abrir dialog de edição de prazo
  const openEditDialog = (deadline: Deadline) => {
    setEditDeadline(deadline);
    setIsEditDialogOpen(true);
  };

  // Verificar se pode editar o prazo (admin/controller ou criador)
  const canEditDeadline = (deadline: Deadline) => {
    if (!user) return false;
    return isAdmin || deadline.advogadoResponsavel?.userId === user.id;
  };

  // Função para executar a extensão do prazo (apenas admin/controller)
  const handleExtenderPrazo = async () => {
    if (!extendDeadline || !novaDataExtensao || !motivoExtensao.trim()) return;
    
    setSalvandoExtensao(true);
    try {
      const dataOriginal = extendDeadline.date;
      
      // Atualizar a data do prazo
      const { error } = await supabase
        .from('deadlines')
        .update({ 
          date: format(novaDataExtensao, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', extendDeadline.id);
      
      if (error) throw error;
      
      // Registrar comentário automático com histórico
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
      
      // Fechar modal e limpar estados
      setIsExtendDialogOpen(false);
      setExtendDeadline(null);
      setNovaDataExtensao(undefined);
      setMotivoExtensao("");
      
      // Recarregar prazos
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
          description: "Nao foi possivel excluir o prazo.",
          variant: "destructive",
        });
        return;
      }

      setDeadlines(deadlines.filter(d => d.id !== deadlineId));
      setIsDetailDialogOpen(false);

      toast({
        title: "Prazo excluido",
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

  const hasDeadlines = (date: Date) => {
    return deadlines.some(deadline => {
      try {
        return isValid(deadline.date) && isSameDay(deadline.date, date);
      } catch {
        return false;
      }
    });
  };

  const checkIfAdmin = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'controller'])
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchAllUsers = async () => {
    console.log('[Agenda] fetchAllUsers called, tenantId:', tenantId);
    if (!tenantId) {
      console.log('[Agenda] fetchAllUsers - No tenantId, returning early');
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name');
    
    console.log('[Agenda] fetchAllUsers result - data:', data?.length, 'error:', error);
    
    if (error) {
      console.error('[Agenda] Error fetching users:', error);
      return;
    }
    
    if (data) {
      const mapped = data.map(u => ({
        id: u.user_id,
        name: u.full_name || u.email,
        email: u.email
      }));
      console.log('[Agenda] Setting allUsers:', mapped.length, 'users');
      setAllUsers(mapped);
    }
  };

  const fetchUserDeadlines = async (userId: string) => {
    try {
      // Buscar IDs de deadlines onde o usuário está tagueado
      const { data: taggedDeadlineIds } = await supabase
        .from('deadline_tags')
        .select('deadline_id')
        .eq('tagged_user_id', userId);

      const taggedIds = taggedDeadlineIds?.map(t => t.deadline_id) || [];

      // Construir query base
      let query = supabase
        .from('deadlines')
        .select(`
          *,
          projects (
            name,
            client
          ),
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (
            user_id,
            full_name,
            avatar_url
          ),
          deadline_tags (
            tagged_user_id,
            tagged_user:profiles!deadline_tags_tagged_user_id_fkey (
              user_id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('completed', false)
        .order('date', { ascending: true });

      // Aplicar filtro: advogado_responsavel_id = userId OU id in (taggedIds)
      if (taggedIds.length > 0) {
        query = query.or(`advogado_responsavel_id.eq.${userId},id.in.(${taggedIds.join(',')})`);
      } else {
        query = query.eq('advogado_responsavel_id', userId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped: Deadline[] = data.map(deadline => ({
          id: deadline.id,
          title: deadline.title,
          description: deadline.description || '',
          date: safeParseDate(deadline.date),
          projectId: deadline.project_id,
          projectName: deadline.projects?.name || 'Projeto nao encontrado',
          clientName: deadline.projects?.client || 'Cliente nao encontrado',
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
              name: tag.tagged_user?.full_name || 'Usuario',
              avatar: tag.tagged_user?.avatar_url
            })),
          processoOabId: deadline.processo_oab_id || undefined,
          createdAt: safeParseTimestamp(deadline.created_at),
          updatedAt: safeParseTimestamp(deadline.updated_at)
        }));
        setFilteredUserDeadlines(mapped);
      }
    } catch (error) {
      console.error('Error fetching user deadlines:', error);
    }
  };

  // Inline DeadlineRow component for minimalist list
  const DeadlineRow = ({ deadline }: { deadline: Deadline }) => {
    const isOverdue = !deadline.completed && safeIsPast(deadline.date);
    const statusColor = deadline.completed 
      ? "bg-primary" 
      : isOverdue 
        ? "bg-destructive" 
        : "bg-muted-foreground/50";

    return (
      <div
        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer flex items-center gap-3"
        onClick={() => openDeadlineDetails(deadline)}
      >
        {/* Status dot */}
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusColor)} />
        
        {/* Title + project */}
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
          </div>
        </div>

        {/* Date */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {safeFormatDate(deadline.date)}
        </span>

        {/* Status badge */}
        <Badge 
          variant={deadline.completed ? "default" : isOverdue ? "destructive" : "secondary"}
          className="text-xs shrink-0"
        >
          {deadline.completed ? "Concluído" : isOverdue ? "Vencido" : "Pendente"}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!deadline.completed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600"
              onClick={() => setConfirmCompleteDeadlineId(deadline.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          {!deadline.completed && isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(deadline)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Prazo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openExtendDialog(deadline)}>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Estender Prazo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout currentPage="agenda">
       <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground">Gerencie prazos e compromissos</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setProcessoOabIdForDeadline(null);
              setProcessoNumeroForDeadline("");
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="professional" className="gap-2">
                <Plus size={16} />
                Novo Prazo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Criar Novo Prazo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {processoNumeroForDeadline && (
                  <div className="p-2 bg-muted rounded-md text-xs">
                    <span className="text-muted-foreground">Vinculado ao processo:</span>
                    <p className="font-medium">{processoNumeroForDeadline}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Titulo</label>
                  <Input
                    placeholder="Digite o titulo do prazo"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descricao</label>
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
                <Button onClick={handleCreateDeadline} className="w-full">
                  Criar Prazo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* User Filter + Search */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Visualizando prazos de:</label>
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
              <SelectTrigger className="w-64">
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
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar prazos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Two-column layout: Calendar + List */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar - Compact Left */}
          <div className="lg:w-[380px] shrink-0">
            <div className="border rounded-lg p-4 bg-card">
              <AgendaCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                deadlines={filteredDeadlines}
              />
            </div>
          </div>

          {/* Minimalist List - Right */}
          <div className="flex-1 space-y-6">
            {/* Overdue Section */}
            {(() => {
              const overdue = getOverdueDeadlines();
              return overdue.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Vencidos ({overdue.length})
                  </h4>
                  <div className="space-y-2">
                    {overdue.map((deadline) => (
                      <DeadlineRow key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Selected Date Section */}
            {(() => {
              const forDate = getDeadlinesForDate(selectedDate).filter(d => !d.completed && !safeIsPast(d.date));
              return (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    {forDate.length > 0 && ` (${forDate.length})`}
                  </h4>
                  {forDate.length > 0 ? (
                    <div className="space-y-2">
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

            {/* Upcoming Section */}
            {(() => {
              const upcoming = getUpcomingDeadlines().filter(d => !isSameDay(d.date, selectedDate));
              return upcoming.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Próximos ({upcoming.length})
                  </h4>
                  <div className="space-y-2">
                    {upcoming.slice(0, 15).map((deadline) => (
                      <DeadlineRow key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Completed Section */}
            {(() => {
              const completed = getCompletedDeadlines();
              return completed.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Concluídos ({completed.length})
                  </h4>
                  <div className="space-y-2">
                    {completed.slice(0, 10).map((deadline) => (
                      <DeadlineRow key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>

        {/* Deadline Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            {selectedDeadline && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedDeadline.title}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Informacoes</TabsTrigger>
                    <TabsTrigger value="comments">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Comentarios
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="info" className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Descricao</label>
                      <p className="text-foreground">{selectedDeadline.description || 'Sem descricao'}</p>
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
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                      <p className="text-foreground">{selectedDeadline.clientName}</p>
                    </div>
                    
                    {selectedDeadline.advogadoResponsavel && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Advogado Responsavel</label>
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
                        <label className="text-sm font-medium text-muted-foreground">Usuarios Marcados</label>
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
                    
                    {/* Origem: Processo Judicial */}
                    {selectedDeadline.processoOrigem && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="h-4 w-4 text-primary" />
                          <label className="text-sm font-medium">Processo Judicial</label>
                        </div>
                        <div className="space-y-1 text-sm">
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
                            onClick={() => {
                              setIsDetailDialogOpen(false);
                              navigate(`/controladoria?processo=${selectedDeadline.processoOrigem?.id}`);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver Processo Completo
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Origem: Processo/Etapa */}
                    {selectedDeadline.protocoloOrigem && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <label className="text-sm font-medium">Processo de Origem</label>
                        </div>
                        <div className="space-y-1 text-sm">
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
                              onClick={() => {
                                setIsDetailDialogOpen(false);
                                navigate(`/project/${selectedDeadline.protocoloOrigem?.projectId}`);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver Projeto
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge 
                        variant={selectedDeadline.completed ? "default" : safeIsPast(selectedDeadline.date) ? "destructive" : "secondary"}
                        className="ml-2"
                      >
                        {selectedDeadline.completed ? "Concluido" : safeIsPast(selectedDeadline.date) ? "Atrasado" : "Pendente"}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {!selectedDeadline.completed && (
                        <Button 
                          onClick={() => setConfirmCompleteDeadlineId(selectedDeadline.id)}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar como Concluido
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Prazo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este prazo? Esta acao nao pode ser desfeita.
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
                    </div>
                  </TabsContent>
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
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmComplete}
                disabled={!comentarioConclusao.trim()}
              >
                Confirmar Conclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Estender Prazo - APENAS ADMIN/CONTROLLER */}
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
      </div>
    </DashboardLayout>
  );
};

export default Agenda;
