import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  ArrowRight, 
  Edit, 
  MessageSquare, 
  Trash2, 
  Upload, 
  ListTodo,
  Search,
  History,
  RefreshCw,
  Palette,
  Link2,
  Unlink,
  Columns,
  PenLine,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryEntry {
  id: string;
  action: string;
  details: string;
  created_at: string;
  user_id: string;
  user_name: string;
  task_title: string;
}

interface ProjectHistoryDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  created: { icon: Plus, color: "text-green-500", label: "Criação" },
  moved: { icon: ArrowRight, color: "text-blue-500", label: "Movimento" },
  edited: { icon: Edit, color: "text-orange-500", label: "Edição" },
  deleted: { icon: Trash2, color: "text-red-600", label: "Exclusão" },
  comment_added: { icon: MessageSquare, color: "text-purple-500", label: "Comentário" },
  comment_edited: { icon: MessageSquare, color: "text-purple-400", label: "Comentário editado" },
  comment_deleted: { icon: Trash2, color: "text-red-500", label: "Comentário excluído" },
  file_uploaded: { icon: Upload, color: "text-cyan-500", label: "Arquivo enviado" },
  file_deleted: { icon: Trash2, color: "text-red-400", label: "Arquivo excluído" },
  tarefa_added: { icon: ListTodo, color: "text-green-400", label: "Tarefa adicionada" },
  tarefa_edited: { icon: ListTodo, color: "text-yellow-500", label: "Tarefa editada" },
  tarefa_deleted: { icon: ListTodo, color: "text-red-400", label: "Tarefa excluída" },
  // Novas ações
  color_changed: { icon: Palette, color: "text-pink-500", label: "Cor alterada" },
  vinculo_created: { icon: Link2, color: "text-indigo-500", label: "Vínculo criado" },
  vinculo_removed: { icon: Unlink, color: "text-gray-500", label: "Vínculo removido" },
  column_created: { icon: Columns, color: "text-green-400", label: "Coluna criada" },
  column_renamed: { icon: PenLine, color: "text-blue-400", label: "Coluna renomeada" },
  column_deleted: { icon: Trash2, color: "text-red-400", label: "Coluna excluída" },
};

const ProjectHistoryDrawer = ({ projectId, isOpen, onClose }: ProjectHistoryDrawerProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, projectId]);

  // Realtime subscription para atualizações em tempo real
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const channel = supabase
      .channel(`task-history-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_history',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          // Buscar nome do usuário para o novo registro
          const newEntry = payload.new as any;
          let userName = 'Usuário desconhecido';
          
          if (newEntry.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newEntry.user_id)
              .single();
            userName = profile?.full_name || 'Usuário desconhecido';
          }

          const historyEntry: HistoryEntry = {
            id: newEntry.id,
            action: newEntry.action,
            details: newEntry.details || '',
            created_at: newEntry.created_at,
            user_id: newEntry.user_id,
            user_name: userName,
            task_title: newEntry.task_title || 'Tarefa'
          };

          // Adicionar no topo da lista
          setHistory(prev => [historyEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, projectId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Buscar histórico diretamente pelo project_id (não precisa mais buscar tasks primeiro)
      const { data: historyData, error: historyError } = await supabase
        .from('task_history')
        .select(`
          id,
          action,
          details,
          created_at,
          user_id,
          task_id,
          task_title
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (historyError) throw historyError;

      if (!historyData || historyData.length === 0) {
        setHistory([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(historyData.map(h => h.user_id).filter(Boolean))];

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Combine data
      const combinedHistory: HistoryEntry[] = historyData.map(h => ({
        id: h.id,
        action: h.action,
        details: h.details || '',
        created_at: h.created_at,
        user_id: h.user_id,
        user_name: profileMap.get(h.user_id) || 'Usuário desconhecido',
        task_title: h.task_title || 'Tarefa removida'
      }));

      setHistory(combinedHistory);
    } catch (error) {
      console.error('Error loading project history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(entry => {
    const matchesSearch = searchTerm === "" || 
      entry.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || entry.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { icon: Edit, color: "text-muted-foreground", label: action };
  };

  const formatActionText = (entry: HistoryEntry) => {
    const { action, details, task_title } = entry;
    
    // Se temos details do banco, usar diretamente (contém contexto completo)
    if (details && details.length > 0) {
      return details;
    }
    
    // Fallback para mensagens genéricas (registros antigos sem details)
    switch (action) {
      case 'created':
        return `Criou o card "${task_title}"`;
      case 'moved':
        return `Moveu o card "${task_title}"`;
      case 'edited':
        return `Editou o card "${task_title}"`;
      case 'deleted':
        return `Excluiu o card "${task_title}"`;
      case 'comment_added':
        return `Comentou no card "${task_title}"`;
      case 'comment_edited':
        return `Editou comentário no card "${task_title}"`;
      case 'comment_deleted':
        return `Excluiu comentário do card "${task_title}"`;
      case 'file_uploaded':
        return `Enviou arquivo no card "${task_title}"`;
      case 'file_deleted':
        return `Excluiu arquivo do card "${task_title}"`;
      case 'tarefa_added':
        return `Adicionou tarefa no card "${task_title}"`;
      case 'tarefa_edited':
        return `Editou tarefa no card "${task_title}"`;
      case 'tarefa_deleted':
        return `Excluiu tarefa do card "${task_title}"`;
      case 'color_changed':
        return `Alterou cor do card "${task_title}"`;
      case 'vinculo_created':
        return `Vinculou processo ao card "${task_title}"`;
      case 'vinculo_removed':
        return `Desvinculou processo do card "${task_title}"`;
      case 'column_created':
        return `Criou nova coluna`;
      case 'column_renamed':
        return `Renomeou coluna`;
      case 'column_deleted':
        return `Excluiu coluna`;
      default:
        return `Ação em "${task_title}"`;
    }
  };

  const exportarHistorico = () => {
    if (filteredHistory.length === 0) return;

    const csvHeaders = ['Data', 'Hora', 'Usuário', 'Ação', 'Detalhes', 'Card'];
    const csvRows = filteredHistory.map(entry => [
      format(new Date(entry.created_at), 'dd/MM/yyyy'),
      format(new Date(entry.created_at), 'HH:mm:ss'),
      entry.user_name,
      getActionConfig(entry.action).label,
      `"${entry.details.replace(/"/g, '""')}"`,
      `"${entry.task_title.replace(/"/g, '""')}"`
    ]);

    const csvContent = [csvHeaders.join(';'), ...csvRows.map(row => row.join(';'))].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico-projeto-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico do Projeto
            <div className="ml-auto flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={exportarHistorico}
                className="h-8 w-8"
                title="Exportar histórico (CSV)"
                disabled={filteredHistory.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={loadHistory}
                className="h-8 w-8"
                title="Atualizar histórico"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou card..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                <SelectItem value="created">Criação</SelectItem>
                <SelectItem value="moved">Movimento</SelectItem>
                <SelectItem value="edited">Edição</SelectItem>
                <SelectItem value="deleted">Exclusão</SelectItem>
                <SelectItem value="comment_added">Comentários</SelectItem>
                <SelectItem value="file_uploaded">Arquivos</SelectItem>
                <SelectItem value="tarefa_added">Tarefas</SelectItem>
                <SelectItem value="color_changed">Cores</SelectItem>
                <SelectItem value="vinculo_created">Vínculos</SelectItem>
                <SelectItem value="column_created">Colunas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {history.length === 0 ? "Nenhum histórico encontrado" : "Nenhum resultado para os filtros"}
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredHistory.map((entry) => {
                  const config = getActionConfig(entry.action);
                  const Icon = config.icon;
                  const isDeletedCard = entry.task_title === 'Tarefa removida' || entry.action === 'deleted';
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {entry.user_name}
                          </p>
                          {isDeletedCard && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">
                              Excluído
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">
                          {formatActionText(entry)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProjectHistoryDrawer;