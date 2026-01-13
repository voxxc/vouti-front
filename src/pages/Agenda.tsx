import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
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
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ArrowLeft, Trash2, UserCheck, Shield, MessageSquare, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeadlineComentarios } from "@/components/Agenda/DeadlineComentarios";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "@/components/Agenda/UserTagSelector";
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
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const Agenda = () => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();
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
    if (user) {
      fetchProjects();
      fetchDeadlines();
      checkIfAdmin();
    }
  }, [user]);

  useEffect(() => {
    console.log('[Agenda] Admin check - isAdmin:', isAdmin, 'tenantId:', tenantId);
    if (isAdmin && tenantId) {
      console.log('[Agenda] Calling fetchAllUsers...');
      fetchAllUsers();
    }
  }, [isAdmin, tenantId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Erro",
          description: "Nao foi possivel carregar os projetos.",
          variant: "destructive",
        });
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
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar projetos.",
        variant: "destructive",
      });
    }
  };

  const fetchDeadlines = async () => {
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
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('[Agenda] Error fetching deadlines:', error);
        toast({
          title: "Erro",
          description: "Nao foi possivel carregar os prazos.",
          variant: "destructive",
        });
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
        updatedAt: safeParseTimestamp(deadline.updated_at)
      }));

      setDeadlines(mappedDeadlines);
    } catch (error) {
      console.error('[Agenda] Error:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar prazos.",
        variant: "destructive",
      });
    }
  };

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
    if (!formData.title.trim() || !formData.projectId || !user) return;

    try {
      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          tenant_id: tenantId,
          title: formData.title,
          description: formData.description,
          date: format(formData.date, 'yyyy-MM-dd'),
          project_id: formData.projectId,
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
    if (!confirmCompleteDeadlineId) return;
    
    const deadline = deadlines.find(d => d.id === confirmCompleteDeadlineId);
    if (!deadline) return;
    
    await toggleDeadlineCompletion(deadline.id);
    await createClientHistory(deadline, 'deadline_completed');
    
    setConfirmCompleteDeadlineId(null);
    setIsDetailDialogOpen(false);
    
    toast({
      title: "Prazo concluido",
      description: "Prazo marcado como concluido e adicionado ao historico do cliente.",
    });
  };

  const openDeadlineDetails = (deadline: Deadline) => {
    setSelectedDeadline(deadline);
    setIsDetailDialogOpen(true);
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

  return (
    <DashboardLayout currentPage="agenda">
      <div className="space-y-6">
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
                  <label className="text-sm font-medium">Projeto</label>
                  <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} - {project.client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar prazos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="pointer-events-auto"
                  modifiers={{
                    hasDeadlines: (date) => hasDeadlines(date)
                  }}
                  modifiersStyles={{
                    hasDeadlines: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Deadlines */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
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
                        <h4 className="font-medium text-sm">{deadline.title}</h4>
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
                          {deadline.completed ? "Concluido" : safeIsPast(deadline.date) ? "Atrasado" : "Pendente"}
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overdue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Prazos Vencidos ({getOverdueDeadlines().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getOverdueDeadlines().map((deadline) => (
                  <div key={deadline.id} className="border rounded p-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                        <p className="text-xs text-red-600">
                          {safeFormatDate(deadline.date)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeadlineDetails(deadline)}
                        className="ml-2"
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
                {getOverdueDeadlines().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum prazo vencido
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Clock className="h-5 w-5" />
                Proximos Prazos ({getUpcomingDeadlines().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getUpcomingDeadlines().slice(0, 10).map((deadline) => (
                  <div key={deadline.id} className="border rounded p-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                        <p className="text-xs text-blue-600">
                          {safeFormatDate(deadline.date)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeadlineDetails(deadline)}
                        className="ml-2"
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
                {getUpcomingDeadlines().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum prazo proximo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Visao do Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Filtrar por usuario</label>
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
                      <SelectValue placeholder="Selecione um usuario" />
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
                        <TableHead>Titulo</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUserDeadlines.map((deadline) => (
                        <TableRow key={deadline.id}>
                          <TableCell className="font-medium">{deadline.title}</TableCell>
                          <TableCell>{deadline.projectName}</TableCell>
                          <TableCell>{safeFormatDate(deadline.date)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={deadline.completed ? "default" : safeIsPast(deadline.date) ? "destructive" : "secondary"}
                            >
                              {deadline.completed ? "Concluido" : safeIsPast(deadline.date) ? "Atrasado" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeadlineDetails(deadline)}
                            >
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
                    Nenhum prazo encontrado para este usuario
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historico de Prazos Cumpridos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Historico de Prazos Cumpridos ({getCompletedDeadlines().length})
              </CardTitle>
              
              {/* Filtro por usuario - apenas Admin */}
              {isAdmin && (
                <Select value={completedFilterUserId || 'all'} onValueChange={setCompletedFilterUserId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos os usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuarios</SelectItem>
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
                    <TableHead>Concluido em</TableHead>
                    {isAdmin && <TableHead>Responsavel</TableHead>}
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCompletedDeadlines().map(deadline => (
                    <TableRow key={deadline.id}>
                      <TableCell className="font-medium">{deadline.title}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeadlineDetails(deadline)}
                        >
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
          onOpenChange={(open) => !open && setConfirmCompleteDeadlineId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Conclusão do Prazo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja marcar este prazo como concluído? 
                Essa ação será registrada no histórico do cliente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmComplete}>
                Confirmar Conclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Agenda;
