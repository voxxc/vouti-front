import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History,
  Plus,
  ArrowRight,
  Edit,
  MessageSquare,
  Upload,
  Trash2,
  Clock
} from "lucide-react";
import { TaskHistoryEntry } from "@/types/project";

interface TaskHistoryPanelProps {
  history: TaskHistoryEntry[];
}

const TaskHistoryPanel = ({ history }: TaskHistoryPanelProps) => {
  const getActionIcon = (action: TaskHistoryEntry['action']) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'moved':
        return <ArrowRight className="h-4 w-4" />;
      case 'edited':
        return <Edit className="h-4 w-4" />;
      case 'comment_added':
      case 'comment_edited':
      case 'comment_deleted':
        return <MessageSquare className="h-4 w-4" />;
      case 'file_uploaded':
        return <Upload className="h-4 w-4" />;
      case 'file_deleted':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: TaskHistoryEntry['action']) => {
    switch (action) {
      case 'created':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'moved':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'edited':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'comment_added':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'comment_edited':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'comment_deleted':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'file_uploaded':
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400';
      case 'file_deleted':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getActionLabel = (action: TaskHistoryEntry['action']) => {
    switch (action) {
      case 'created':
        return 'Criado';
      case 'moved':
        return 'Movido';
      case 'edited':
        return 'Editado';
      case 'comment_added':
        return 'Comentário Adicionado';
      case 'comment_edited':
        return 'Comentário Editado';
      case 'comment_deleted':
        return 'Comentário Excluído';
      case 'file_uploaded':
        return 'Arquivo Enviado';
      case 'file_deleted':
        return 'Arquivo Excluído';
      default:
        return 'Ação';
    }
  };

  const sortedHistory = history.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Histórico
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {history.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Histórico de Edições</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          {sortedHistory.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-4">
                {sortedHistory.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-muted">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getActionColor(entry.action)}`}>
                          {getActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {getActionLabel(entry.action)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              por {entry.user}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mb-2">
                            {entry.details}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade registrada
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskHistoryPanel;