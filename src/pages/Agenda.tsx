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
import { DeadlineComentarios } from "@/components/Agenda/DeadlineComentarios";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "@/components/Agenda/UserTagSelector";
import { Project } from "@/types/project";
import { Deadline, DeadlineFormData } from "@/types/agenda";
import { format, isSameDay, isPast, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";

const Agenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [selectedAdvogado, setSelectedAdvogado] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [filteredUserId, setFilteredUserId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filteredUserDeadlines, setFilteredUserDeadlines] = useState<Deadline[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchDeadlines();
      checkIfAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os projetos.",
          variant: "destructive",
        });
        return;
      }

      // Mapear os dados do Supabase para o formato Project
      const mappedProjects: Project[] = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        client: project.client,
        description: project.description || '',
        tasks: [],
        acordoTasks: [],
        createdBy: project.created_by,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at)
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
      console.log('[Agenda] Fetching deadlines...');
      
      // Verificar se é admin para log
      if (user) {
        const isAdminUser = await checkIfUserIsAdminOrController(user.id);
        console.log('[Agenda] User is admin/controller:', isAdminUser);
      }
      
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
          description: "Não foi possível carregar os prazos.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[Agenda] Loaded ${data?.length || 0} deadlines`);

      // Mapear os dados do Supabase para o formato Deadline
      const mappedDeadlines: Deadline[] = (data || []).map(deadline => ({
        id: deadline.id,
        title: deadline.title,
        description: deadline.description || '',
        date: parseISO(deadline.date + 'T12:00:00'),
        projectId: deadline.project_id,
        projectName: deadline.projects?.name || 'Projeto não encontrado',
        clientName: deadline.projects?.client || 'Cliente não encontrado',
        completed: deadline.completed,
        advogadoResponsavel: deadline.advogado ? {
          userId: deadline.advogado.user_id,
          name: deadline.advogado.full_name,
          avatar: deadline.advogado.avatar_url
        } : undefined,
        taggedUsers: (deadline.deadline_tags || []).map((tag: any) => ({
          userId: tag.tagged_user?.user_id,
          name: tag.tagged_user?.full_name,
          avatar: tag.tagged_user?.avatar_url
        })),
        createdAt: new Date(deadline.created_at),
        updatedAt: new Date(deadline.updated_at)
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
    return filteredDeadlines.filter(deadline => isSameDay(deadline.date, date));
  };

  const getOverdueDeadlines = () => {
    return filteredDeadlines.filter(deadline => isPast(deadline.date) && !deadline.completed);
  };

  const getUpcomingDeadlines = () => {
    return filteredDeadlines.filter(deadline => isFuture(deadline.date) && !deadline.completed);
  };

  const handleCreateDeadline = async () => {
    if (!formData.title.trim() || !formData.projectId || !user) return;

    try {
      console.log('[Agenda] Creating deadline with tags:', taggedUsers);
      
      // Criar o deadline
      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          date: format(formData.date, 'yyyy-MM-dd'),
          project_id: formData.projectId,
          advogado_responsavel_id: selectedAdvogado
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
          description: "Não foi possível criar o prazo.",
          variant: "destructive",
        });
        return;
      }

      // Criar tags se houver usuários selecionados
      if (taggedUsers.length > 0) {
        const tags = taggedUsers.map(userId => ({
          deadline_id: data.id,
          tagged_user_id: userId
        }));

        const { error: tagsError } = await supabase
          .from('deadline_tags')
          .insert(tags);

        if (tagsError) {
          console.error('[Agenda] Error creating tags:', tagsError);
          // Continuar mesmo com erro nas tags
        }
      }

      // Recarregar deadlines para pegar os dados completos com tags
      await fetchDeadlines();

      // Limpar formulário
      setFormData({
        title: "",
        description: "",
        date: selectedDate,
        projectId: ""
      });
      setSelectedAdvogado(null);
      setTaggedUsers([]);
      setIsDialogOpen(false);

      toast({
        title: "✓ Prazo criado",
        description: taggedUsers.length > 0 
          ? `Prazo criado e ${taggedUsers.length} usuário(s) foram marcados.`
          : "Novo prazo adicionado à agenda com sucesso.",
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
          description: "Não foi possível atualizar o status do prazo.",
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

  const handleCompleteDeadline = async (deadline: Deadline) => {
    await toggleDeadlineCompletion(deadline.id);
    await createClientHistory(deadline, 'deadline_completed');
    setIsDetailDialogOpen(false);
    
    toast({
      title: "Prazo concluído",
      description: "Prazo marcado como concluído e adicionado ao histórico do cliente.",
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

  const hasDeadlines = (date: Date) => {
    return deadlines.some(deadline => isSameDay(deadline.date, date));
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
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('full_name');
    
    if (!error && data) {
      setAllUsers(data.map(u => ({
        id: u.user_id,
        name: u.full_name || u.email,
        email: u.email
      })));
    }
  };

  const fetchUserDeadlines = async (userId: string) => {
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
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (!error && data) {
        const mapped: Deadline[] = data.map(deadline => ({
          id: deadline.id,
          title: deadline.title,
          description: deadline.description || '',
          date: parseISO(deadline.date + 'T12:00:00'),
          projectId: deadline.project_id,
          projectName: deadline.projects?.name || 'Projeto não encontrado',
          clientName: deadline.projects?.client || 'Cliente não encontrado',
          completed: deadline.completed,
          advogadoResponsavel: deadline.advogado ? {
            userId: deadline.advogado.user_id,
            name: deadline.advogado.full_name,
            avatar: deadline.advogado.avatar_url
          } : undefined,
          taggedUsers: (deadline.deadline_tags || []).map((tag: any) => ({
            userId: tag.tagged_user?.user_id,
            name: tag.tagged_user?.full_name,
            avatar: tag.tagged_user?.avatar_url
          })),
          createdAt: new Date(deadline.created_at),
          updatedAt: new Date(deadline.updated_at)
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="professional" className="gap-2">
                <Plus size={16} />
                Novo Prazo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Prazo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                    className="min-h-[80px]"
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
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    className="border rounded-md p-3 pointer-events-auto"
                  />
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
                  Calendário
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
                            toggleDeadlineCompletion(deadline.id);
                          }}
                          className={deadline.completed ? "text-green-600" : "text-muted-foreground"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{deadline.description}</p>
                      
                      {/* Advogado Responsável */}
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
                      
                      {/* Usuários Tagados */}
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
                          variant={deadline.completed ? "default" : isPast(deadline.date) ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {deadline.completed ? "Concluído" : isPast(deadline.date) ? "Atrasado" : "Pendente"}
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
                  <div key={deadline.id} className="border rounded p-2 bg-red-50 border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                        <p className="text-xs text-red-600">
                          {format(deadline.date, "dd/MM/yyyy", { locale: ptBR })}
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
                Próximos Prazos ({getUpcomingDeadlines().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getUpcomingDeadlines().slice(0, 10).map((deadline) => (
                  <div key={deadline.id} className="border rounded p-2 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                        <p className="text-xs text-blue-600">
                          {format(deadline.date, "dd/MM/yyyy", { locale: ptBR })}
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
                    Nenhum prazo próximo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Filter Section */}
        {isAdmin && (
          <div className="mt-8 space-y-4">
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="destructive" className="gap-1">
                  <Shield className="h-3 w-3" />
                  ÁREA ADMINISTRATIVA
                </Badge>
                <h3 className="text-lg font-semibold">Visualizar Prazos de Outros Usuários</h3>
              </div>
              
              <Select value={filteredUserId || ""} onValueChange={(value) => {
                setFilteredUserId(value);
                if (value) fetchUserDeadlines(value);
                else setFilteredUserDeadlines([]);
              }}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Selecione um usuário para filtrar..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredUserId && filteredUserDeadlines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Prazos de {allUsers.find(u => u.id === filteredUserId)?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUserDeadlines.map(deadline => (
                          <TableRow key={deadline.id}>
                            <TableCell className="font-medium">{deadline.title}</TableCell>
                            <TableCell>{deadline.projectName}</TableCell>
                            <TableCell>{deadline.clientName}</TableCell>
                            <TableCell>{format(deadline.date, "dd/MM/yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={deadline.completed ? "default" : isPast(deadline.date) ? "destructive" : "secondary"}>
                                {deadline.completed ? "Concluído" : isPast(deadline.date) ? "Atrasado" : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deadline.advogadoResponsavel ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={deadline.advogadoResponsavel.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {deadline.advogadoResponsavel.name?.charAt(0).toUpperCase() || 'A'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{deadline.advogadoResponsavel.name}</span>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
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
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredUserId && filteredUserDeadlines.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Este usuário não possui prazos cadastrados.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modal de Detalhes do Prazo */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Prazo</DialogTitle>
            </DialogHeader>
            {selectedDeadline && (
              <Tabs defaultValue="detalhes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="detalhes" className="gap-2">
                    <Info className="h-4 w-4" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="comentarios" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentários
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <p className="text-sm border rounded p-2 bg-muted break-words whitespace-pre-wrap">
                      {selectedDeadline.title}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <p className="text-sm border rounded p-2 bg-muted min-h-[100px] max-h-[200px] overflow-y-auto break-words whitespace-pre-wrap">
                      {selectedDeadline.description || 'Nenhuma descrição fornecida'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Projeto</label>
                    <p className="text-sm border rounded p-2 bg-muted break-words whitespace-pre-wrap">
                      {selectedDeadline.projectName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Cliente</label>
                    <p className="text-sm border rounded p-2 bg-muted break-words whitespace-pre-wrap">
                      {selectedDeadline.clientName}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Data do Prazo</label>
                    <p className="text-sm border rounded p-2 bg-muted break-words whitespace-pre-wrap">
                      {format(selectedDeadline.date, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Status:</label>
                    <Badge 
                      variant={selectedDeadline.completed ? "default" : isPast(selectedDeadline.date) ? "destructive" : "secondary"}
                    >
                      {selectedDeadline.completed ? "Concluído" : isPast(selectedDeadline.date) ? "Atrasado" : "Pendente"}
                    </Badge>
                  </div>

                  {selectedDeadline.advogadoResponsavel && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Advogado Responsável:</label>
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedDeadline.advogadoResponsavel.avatar} />
                          <AvatarFallback className="text-xs">
                            {selectedDeadline.advogadoResponsavel.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-primary">
                          {selectedDeadline.advogadoResponsavel.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedDeadline.taggedUsers && selectedDeadline.taggedUsers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium block mb-2">Usuários Tagados:</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDeadline.taggedUsers.map((user) => (
                          <div 
                            key={user.userId}
                            className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {user.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {!selectedDeadline.completed && (
                      <Button 
                        onClick={() => handleCompleteDeadline(selectedDeadline)} 
                        className="flex-1"
                        variant="professional"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Concluído
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Prazo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este prazo? Esta ação não pode ser desfeita e todos os comentários serão perdidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleDeleteDeadline(selectedDeadline.id);
                              setIsDetailDialogOpen(false);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>

                <TabsContent value="comentarios" className="mt-4">
                  <DeadlineComentarios 
                    deadlineId={selectedDeadline.id}
                    currentUserId={user?.id || ''}
                  />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Agenda;