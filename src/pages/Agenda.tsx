import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Project } from "@/types/project";
import { Deadline, DeadlineFormData } from "@/types/agenda";
import { format, isSameDay, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Agenda = () => {
  const { user } = useAuth();
  const handleBack = () => {
    window.history.back();
  };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DeadlineFormData>({
    title: "",
    description: "",
    date: new Date(),
    projectId: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchDeadlines();
    }
  }, [user]);

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
      const { data, error } = await supabase
        .from('deadlines')
        .select(`
          *,
          projects!deadlines_project_id_fkey (
            name,
            client
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching deadlines:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os prazos.",
          variant: "destructive",
        });
        return;
      }

      // Mapear os dados do Supabase para o formato Deadline
      const mappedDeadlines: Deadline[] = (data || []).map(deadline => ({
        id: deadline.id,
        title: deadline.title,
        description: deadline.description || '',
        date: new Date(deadline.date),
        projectId: deadline.project_id,
        projectName: deadline.projects?.name || 'Projeto não encontrado',
        clientName: deadline.projects?.client || 'Cliente não encontrado',
        completed: deadline.completed,
        createdAt: new Date(deadline.created_at),
        updatedAt: new Date(deadline.updated_at)
      }));

      setDeadlines(mappedDeadlines);
    } catch (error) {
      console.error('Error:', error);
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
      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          date: formData.date.toISOString().split('T')[0], // Formato YYYY-MM-DD
          project_id: formData.projectId
        })
        .select(`
          *,
          projects!deadlines_project_id_fkey (
            name,
            client
          )
        `)
        .single();

      if (error) {
        console.error('Error creating deadline:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o prazo.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o novo prazo à lista local
      const newDeadline: Deadline = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        date: new Date(data.date),
        projectId: data.project_id,
        projectName: data.projects?.name || 'Projeto não encontrado',
        clientName: data.projects?.client || 'Cliente não encontrado',
        completed: data.completed,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setDeadlines([...deadlines, newDeadline]);
      setFormData({
        title: "",
        description: "",
        date: new Date(),
        projectId: ""
      });
      setIsDialogOpen(false);

      toast({
        title: "Prazo criado",
        description: "Novo prazo adicionado à agenda com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
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

  const hasDeadlines = (date: Date) => {
    return deadlines.some(deadline => isSameDay(deadline.date, date));
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
                    <div key={deadline.id} className="border rounded-lg p-3 bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{deadline.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDeadlineCompletion(deadline.id)}
                          className={deadline.completed ? "text-green-600" : "text-muted-foreground"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{deadline.description}</p>
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
                      <div>
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-600">
                          {format(deadline.date, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
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
                      <div>
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600">
                          {format(deadline.date, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
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
      </div>
    </DashboardLayout>
  );
};

export default Agenda;