import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import AgendaCalendar from "./AgendaCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2, UserCheck, Shield, MessageSquare, Info, Scale, FileText, ExternalLink, MoreVertical, CalendarClock } from "lucide-react";
import { DeadlineComentarios } from "./DeadlineComentarios";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "./UserTagSelector";
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

export function AgendaContent() {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();
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
  const [filteredUserId, setFilteredUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filteredUserDeadlines, setFilteredUserDeadlines] = useState<Deadline[]>([]);
  const [completedFilterUserId, setCompletedFilterUserId] = useState<string | null>(null);
  const [confirmCompleteDeadlineId, setConfirmCompleteDeadlineId] = useState<string | null>(null);
  const [comentarioConclusao, setComentarioConclusao] = useState("");

  // Estados para modal de extensão de prazo
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [extendDeadline, setExtendDeadline] = useState<Deadline | null>(null);
  const [novaDataExtensao, setNovaDataExtensao] = useState<Date | undefined>(undefined);
  const [motivoExtensao, setMotivoExtensao] = useState("");
  const [salvandoExtensao, setSalvandoExtensao] = useState(false);

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

  // Helper para formatar título com nome do responsável
  const formatDeadlineTitle = (deadline: Deadline) => {
    const nome = deadline.advogadoResponsavel?.name;
    if (nome) {
      const primeiroNome = nome.split(' ')[0];
      return `${primeiroNome} | ${deadline.title}`;
    }
    return deadline.title;
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
    if (isAdmin && tenantId) {
      fetchAllUsers();
    }
  }, [isAdmin, tenantId]);

  // ===== Data Fetching =====
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
            protocolo:project_protocolos (nome, project_id)
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('[AgendaContent] Error fetching deadlines:', error);
        return;
      }

      const mappedDeadlines: Deadline[] = (data || []).map(deadline => ({
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
        processoOrigem: deadline.processo_oab ? {
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
        } : undefined
      }));

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

  const fetchUserDeadlines = async (userId: string) => {
    try {
      const { data: taggedDeadlineIds } = await supabase
        .from('deadline_tags')
        .select('deadline_id')
        .eq('tagged_user_id', userId);

      const taggedIds = taggedDeadlineIds?.map(t => t.deadline_id) || [];

      let query = supabase
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
          )
        `)
        .eq('completed', false)
        .order('date', { ascending: true });

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
          updatedAt: safeParseTimestamp(deadline.updated_at)
        }));
        setFilteredUserDeadlines(mapped);
      }
    } catch (error) {
      console.error('Error fetching user deadlines:', error);
    }
  };

  // ===== Computed Values =====
  const filteredDeadlines = deadlines.filter(deadline =>
    deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deadline.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    let completed = filteredDeadlines.filter(d => d.completed);
    
    if (!isAdmin) {
      completed = completed.filter(d => 
        d.advogadoResponsavel?.userId === user?.id ||
        d.taggedUsers?.some(t => t.userId === user?.id)
      );
    } else if (completedFilterUserId && completedFilterUserId !== 'all') {
      completed = completed.filter(d =>
        d.advogadoResponsavel?.userId === completedFilterUserId ||
        d.taggedUsers?.some(t => t.userId === completedFilterUserId)
      );
    }
    
    return completed.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };

  // ===== Handlers =====
  const handleCreateDeadline = async () => {
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
          advogado_responsavel_id: selectedAdvogado
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

      setFormData({ title: "", description: "", date: selectedDate, projectId: "" });
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

  // ===== Render =====
  return (
    <div className="space-y-6">
      {/* Header com busca e botão novo */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar prazos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
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

      {/* Calendário */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="h-4 w-4" />
            Calendário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AgendaCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            deadlines={filteredDeadlines}
          />
        </CardContent>
      </Card>

      {/* Prazos do dia selecionado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getDeadlinesForDate(selectedDate).map((deadline) => (
              <div 
                key={deadline.id} 
                className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDeadlineDetails(deadline)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{formatDeadlineTitle(deadline)}</h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!deadline.completed) {
                          setConfirmCompleteDeadlineId(deadline.id);
                        } else {
                          toggleDeadlineCompletion(deadline.id);
                        }
                      }}
                      className={deadline.completed ? "text-green-600" : "text-muted-foreground"}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    
                    {!deadline.completed && isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              openExtendDialog(deadline);
                            }}
                          >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Estender Prazo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{deadline.description}</p>
                
                {deadline.advogadoResponsavel && (
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-3 w-3 text-primary" />
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={deadline.advogadoResponsavel.avatar} />
                        <AvatarFallback className="text-xs">
                          {deadline.advogadoResponsavel.name?.charAt(0).toUpperCase() || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {deadline.advogadoResponsavel.name}
                      </span>
                    </div>
                  </div>
                )}
                
                {deadline.taggedUsers && deadline.taggedUsers.length > 0 && (
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Tags:</span>
                    {deadline.taggedUsers.map((tagged, idx) => (
                      <Avatar key={idx} className="h-5 w-5">
                        <AvatarImage src={tagged.avatar} />
                        <AvatarFallback className="text-xs">
                          {tagged.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {deadline.projectName}
                  </Badge>
                  <Badge 
                    variant={deadline.completed ? "default" : safeIsPast(deadline.date) ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {deadline.completed ? "Concluído" : safeIsPast(deadline.date) ? "Atrasado" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
            {getDeadlinesForDate(selectedDate).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum prazo para esta data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards Vencidos e Próximos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vencidos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Prazos Vencidos ({getOverdueDeadlines().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getOverdueDeadlines().map((deadline) => (
                <div key={deadline.id} className="border rounded p-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{formatDeadlineTitle(deadline)}</p>
                      <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                      <p className="text-xs text-red-600">{safeFormatDate(deadline.date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openDeadlineDetails(deadline)}>
                        Detalhes
                      </Button>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openExtendDialog(deadline)}>
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Estender Prazo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {getOverdueDeadlines().length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo vencido</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Próximos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-600 text-sm">
              <Clock className="h-4 w-4" />
              Próximos Prazos ({getUpcomingDeadlines().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getUpcomingDeadlines().slice(0, 10).map((deadline) => (
                <div key={deadline.id} className="border rounded p-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{formatDeadlineTitle(deadline)}</p>
                      <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                      <p className="text-xs text-blue-600">{safeFormatDate(deadline.date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openDeadlineDetails(deadline)}>
                        Detalhes
                      </Button>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openExtendDialog(deadline)}>
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Estender Prazo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {getUpcomingDeadlines().length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo próximo</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Visão do Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Filtrar por usuário</label>
                <Select 
                  value={filteredUserId || "all"} 
                  onValueChange={(value) => {
                    const userId = value === "all" ? null : value;
                    setFilteredUserId(userId);
                    if (userId) {
                      fetchUserDeadlines(userId);
                    } else {
                      setFilteredUserDeadlines([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {allUsers.length === 0 ? 'Carregando usuários...' : `${allUsers.length} usuários encontrados`}
                </p>
              </div>
              
              {filteredUserId && filteredUserDeadlines.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserDeadlines.map((deadline) => (
                      <TableRow key={deadline.id}>
                        <TableCell className="font-medium">{formatDeadlineTitle(deadline)}</TableCell>
                        <TableCell>{deadline.projectName}</TableCell>
                        <TableCell>{safeFormatDate(deadline.date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={deadline.completed ? "default" : safeIsPast(deadline.date) ? "destructive" : "secondary"}
                          >
                            {deadline.completed ? "Concluído" : safeIsPast(deadline.date) ? "Atrasado" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openDeadlineDetails(deadline)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              
              {filteredUserId && filteredUserDeadlines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum prazo encontrado para este usuário
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Prazos Cumpridos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Histórico de Prazos Cumpridos ({getCompletedDeadlines().length})
            </CardTitle>
            
            {isAdmin && (
              <Select value={completedFilterUserId || 'all'} onValueChange={setCompletedFilterUserId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {getCompletedDeadlines().length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Data Original</TableHead>
                  <TableHead>Concluído em</TableHead>
                  {isAdmin && <TableHead>Responsável</TableHead>}
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCompletedDeadlines().map(deadline => (
                  <TableRow key={deadline.id}>
                    <TableCell className="font-medium">{formatDeadlineTitle(deadline)}</TableCell>
                    <TableCell>{deadline.projectName}</TableCell>
                    <TableCell>{safeFormatDate(deadline.date)}</TableCell>
                    <TableCell>{safeFormatDate(deadline.updatedAt)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={deadline.advogadoResponsavel?.avatar} />
                            <AvatarFallback className="text-xs">
                              {deadline.advogadoResponsavel?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {deadline.advogadoResponsavel?.name || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDeadlineDetails(deadline)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum prazo cumprido ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <TabsTrigger value="info">Informações</TabsTrigger>
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
                      {selectedDeadline.completed ? "Concluído" : safeIsPast(selectedDeadline.date) ? "Atrasado" : "Pendente"}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {!selectedDeadline.completed && (
                      <Button 
                        onClick={() => setConfirmCompleteDeadlineId(selectedDeadline.id)}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Concluído
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
    </div>
  );
}