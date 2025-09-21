import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Task, Comment, TASK_STATUSES } from "@/types/project";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, Edit2, Trash2, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
}

const TaskModal = ({ task, isOpen, onClose, onUpdateTask }: TaskModalProps) => {
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const { toast } = useToast();

  if (!task) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedTask = {
      ...task,
      comments: [...task.comments, comment],
      updatedAt: new Date()
    };

    onUpdateTask(updatedTask);
    setNewComment("");
    
    toast({
      title: "Comentário adicionado",
      description: "Novo comentário foi adicionado à tarefa.",
    });
  };

  const handleEditComment = (commentId: string) => {
    const comment = task.comments.find(c => c.id === commentId);
    if (comment) {
      setEditingComment(commentId);
      setEditCommentText(comment.text);
    }
  };

  const handleSaveComment = (commentId: string) => {
    if (!editCommentText.trim()) return;

    const updatedComments = task.comments.map(comment =>
      comment.id === commentId
        ? { ...comment, text: editCommentText, updatedAt: new Date() }
        : comment
    );

    const updatedTask = {
      ...task,
      comments: updatedComments,
      updatedAt: new Date()
    };

    onUpdateTask(updatedTask);
    setEditingComment(null);
    setEditCommentText("");
    
    toast({
      title: "Comentário editado",
      description: "Comentário foi atualizado com sucesso.",
    });
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = task.comments.filter(comment => comment.id !== commentId);
    
    const updatedTask = {
      ...task,
      comments: updatedComments,
      updatedAt: new Date()
    };

    onUpdateTask(updatedTask);
    
    toast({
      title: "Comentário removido",
      description: "Comentário foi removido da tarefa.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{task.title}</span>
            <Badge 
              variant="secondary" 
              className={`${
                task.status === 'waiting' ? 'bg-status-waiting text-yellow-800' :
                task.status === 'todo' ? 'bg-status-todo text-blue-800' :
                task.status === 'progress' ? 'bg-status-progress text-orange-800' :
                'bg-status-done text-green-800'
              }`}
            >
              {TASK_STATUSES[task.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Task Description */}
          <div>
            <h3 className="text-sm font-medium mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-4 w-4" />
              <h3 className="text-sm font-medium">Comentários ({task.comments.length})</h3>
            </div>

            {/* Add New Comment */}
            <div className="space-y-3 mb-4">
              <Textarea
                placeholder="Adicionar um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <Button onClick={handleAddComment} className="gap-2" size="sm">
                <Plus className="h-3 w-3" />
                Adicionar Comentário
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {task.comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-3 bg-card">
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleSaveComment(comment.id)} 
                          size="sm" 
                          className="gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Salvar
                        </Button>
                        <Button 
                          onClick={() => setEditingComment(null)} 
                          variant="outline" 
                          size="sm"
                          className="gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm mb-2">{comment.text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(comment.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {comment.updatedAt !== comment.createdAt && " (editado)"}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditComment(comment.id)}
                            className="h-6 w-6"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-6 w-6 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {task.comments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum comentário ainda</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;