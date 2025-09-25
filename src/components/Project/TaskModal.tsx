import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Save, X, Plus, Edit2, Trash2 } from "lucide-react";
import { Task, TASK_STATUSES, Comment, TaskFile, TaskHistoryEntry, AcordoDetails } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskFilePanel from "./TaskFilePanel";
import TaskHistoryPanel from "./TaskHistoryPanel";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
}

const TaskModal = ({ task, isOpen, onClose, onUpdateTask }: TaskModalProps) => {
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [editedAcordoDetails, setEditedAcordoDetails] = useState<AcordoDetails>({});
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description);
      setEditedAcordoDetails(task.acordoDetails || {});
    }
  }, [task]);

  if (!task) return null;

  const handleEditTask = () => {
    setIsEditingTask(true);
    setEditedTitle(task.title);
    setEditedDescription(task.description);
    setEditedAcordoDetails(task.acordoDetails || {});
  };

  const handleSaveTask = () => {
    if (editedTitle.trim()) {
      const historyEntry: TaskHistoryEntry = {
        id: `history-${Date.now()}`,
        action: 'edited',
        details: `Tarefa editada`,
        user: "Usuário Atual",
        timestamp: new Date()
      };

      const updatedTask = {
        ...task,
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        acordoDetails: task.type === 'acordo' ? editedAcordoDetails : task.acordoDetails,
        history: [...task.history, historyEntry],
        updatedAt: new Date()
      };
      
      onUpdateTask(updatedTask);
      setIsEditingTask(false);
      
      toast({
        title: "Tarefa atualizada",
        description: "As alterações foram salvas!",
      });
    }
  };

  const handleCancelEditTask = () => {
    setIsEditingTask(false);
    setEditedTitle(task.title);
    setEditedDescription(task.description);
    setEditedAcordoDetails(task.acordoDetails || {});
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: `comment-${Date.now()}`,
        text: newComment.trim(),
        author: "Usuário Atual", // Replace with actual user
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const historyEntry: TaskHistoryEntry = {
        id: `history-${Date.now()}`,
        action: 'comment_added',
        details: `Comentário adicionado: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
        user: "Usuário Atual",
        timestamp: new Date()
      };
      
      const updatedTask = {
        ...task,
        comments: [...task.comments, comment],
        history: [...task.history, historyEntry],
        updatedAt: new Date()
      };
      
      onUpdateTask(updatedTask);
      setNewComment("");
      
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi salvo com sucesso!",
      });
    }
  };

  const handleUploadFile = (file: File) => {
    const taskFile: TaskFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file), // In real app, upload to server
      size: file.size,
      type: file.type,
      uploadedBy: "Usuário Atual",
      uploadedAt: new Date()
    };

    const historyEntry: TaskHistoryEntry = {
      id: `history-${Date.now()}`,
      action: 'file_uploaded',
      details: `Arquivo enviado: ${file.name}`,
      user: "Usuário Atual",
      timestamp: new Date()
    };

    const updatedTask = {
      ...task,
      files: [...task.files, taskFile],
      history: [...task.history, historyEntry],
      updatedAt: new Date()
    };

    onUpdateTask(updatedTask);

    toast({
      title: "Arquivo enviado",
      description: `${file.name} foi adicionado com sucesso!`,
    });
  };

  const handleDeleteFile = (fileId: string) => {
    const file = task.files.find(f => f.id === fileId);
    if (!file) return;

    const historyEntry: TaskHistoryEntry = {
      id: `history-${Date.now()}`,
      action: 'file_deleted',
      details: `Arquivo excluído: ${file.name}`,
      user: "Usuário Atual",
      timestamp: new Date()
    };

    const updatedTask = {
      ...task,
      files: task.files.filter(f => f.id !== fileId),
      history: [...task.history, historyEntry],
      updatedAt: new Date()
    };

    onUpdateTask(updatedTask);

    toast({
      title: "Arquivo excluído",
      description: `${file.name} foi removido com sucesso!`,
    });
  };

  const handleEditComment = (commentId: string) => {
    const comment = task.comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditedCommentText(comment.text);
    }
  };

  const handleSaveComment = (commentId: string) => {
    if (editedCommentText.trim()) {
      const updatedComments = task.comments.map(comment =>
        comment.id === commentId
          ? { ...comment, text: editedCommentText.trim(), updatedAt: new Date() }
          : comment
      );

      const historyEntry: TaskHistoryEntry = {
        id: `history-${Date.now()}`,
        action: 'comment_edited',
        details: `Comentário editado`,
        user: "Usuário Atual",
        timestamp: new Date()
      };
      
      const updatedTask = {
        ...task,
        comments: updatedComments,
        history: [...task.history, historyEntry],
        updatedAt: new Date()
      };
      
      onUpdateTask(updatedTask);
      setEditingCommentId(null);
      setEditedCommentText("");
      
      toast({
        title: "Comentário atualizado",
        description: "As alterações foram salvas!",
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    const historyEntry: TaskHistoryEntry = {
      id: `history-${Date.now()}`,
      action: 'comment_deleted',
      details: `Comentário excluído`,
      user: "Usuário Atual",
      timestamp: new Date()
    };

    const updatedComments = task.comments.filter(comment => comment.id !== commentId);
    
    const updatedTask = {
      ...task,
      comments: updatedComments,
      history: [...task.history, historyEntry],
      updatedAt: new Date()
    };
    
    onUpdateTask(updatedTask);
    
    toast({
      title: "Comentário excluído",
      description: "O comentário foi removido!",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditingTask ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Título da tarefa"
                />
              ) : (
                <DialogTitle className="text-lg">{task.title}</DialogTitle>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {isEditingTask ? (
                <>
                  <Button onClick={handleSaveTask} size="sm" className="gap-1">
                    <Save className="h-3 w-3" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancelEditTask} variant="outline" size="sm" className="gap-1">
                    <X className="h-3 w-3" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditTask} variant="ghost" size="sm" className="gap-1">
                  <Edit className="h-3 w-3" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium mb-2">Descrição</h3>
              {isEditingTask ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Descrição da tarefa"
                  className="min-h-[80px]"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {task.description || "Nenhuma descrição fornecida"}
                </p>
              )}
            </div>

            {/* Acordo Details */}
            {task.type === 'acordo' && (
              <div>
                <h3 className="text-sm font-medium mb-2">Detalhes do Acordo</h3>
                {isEditingTask ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium">Contrato/Processo:</label>
                      <Input
                        value={editedAcordoDetails.contratoProcesso || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          contratoProcesso: e.target.value
                        })}
                        placeholder="Número do contrato/processo"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Banco:</label>
                      <Input
                        value={editedAcordoDetails.banco || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          banco: e.target.value
                        })}
                        placeholder="Nome do banco"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Valor original:</label>
                      <Input
                        type="number"
                        value={editedAcordoDetails.valorOriginal || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          valorOriginal: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="0,00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Valor atualizado:</label>
                      <Input
                        type="number"
                        value={editedAcordoDetails.valorAtualizado || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          valorAtualizado: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="0,00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">À vista:</label>
                      <Input
                        type="number"
                        value={editedAcordoDetails.aVista || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          aVista: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="0,00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Honorários:</label>
                      <Input
                        type="number"
                        value={editedAcordoDetails.honorarios || ""}
                        onChange={(e) => setEditedAcordoDetails({
                          ...editedAcordoDetails,
                          honorarios: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="0,00"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Parcelado:</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <Input
                          type="number"
                          value={editedAcordoDetails.parcelado?.entrada || ""}
                          onChange={(e) => setEditedAcordoDetails({
                            ...editedAcordoDetails,
                            parcelado: {
                              ...editedAcordoDetails.parcelado,
                              entrada: e.target.value ? Number(e.target.value) : 0,
                              parcelas: editedAcordoDetails.parcelado?.parcelas || 0,
                              quantidadeParcelas: editedAcordoDetails.parcelado?.quantidadeParcelas || 0
                            }
                          })}
                          placeholder="Entrada"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={editedAcordoDetails.parcelado?.parcelas || ""}
                          onChange={(e) => setEditedAcordoDetails({
                            ...editedAcordoDetails,
                            parcelado: {
                              ...editedAcordoDetails.parcelado,
                              entrada: editedAcordoDetails.parcelado?.entrada || 0,
                              parcelas: e.target.value ? Number(e.target.value) : 0,
                              quantidadeParcelas: editedAcordoDetails.parcelado?.quantidadeParcelas || 0
                            }
                          })}
                          placeholder="Valor parcela"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          value={editedAcordoDetails.parcelado?.quantidadeParcelas || ""}
                          onChange={(e) => setEditedAcordoDetails({
                            ...editedAcordoDetails,
                            parcelado: {
                              ...editedAcordoDetails.parcelado,
                              entrada: editedAcordoDetails.parcelado?.entrada || 0,
                              parcelas: editedAcordoDetails.parcelado?.parcelas || 0,
                              quantidadeParcelas: e.target.value ? Number(e.target.value) : 0
                            }
                          })}
                          placeholder="Qtd parcelas"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {task.acordoDetails?.contratoProcesso && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contrato/Processo:</span>
                        <span className="font-medium">{task.acordoDetails.contratoProcesso}</span>
                      </div>
                    )}
                    {task.acordoDetails?.valorOriginal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor original:</span>
                        <span className="font-medium">R$ {task.acordoDetails.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {task.acordoDetails?.valorAtualizado !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor atualizado:</span>
                        <span className="font-medium">R$ {task.acordoDetails.valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {task.acordoDetails?.banco && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Banco:</span>
                        <span className="font-medium">{task.acordoDetails.banco}</span>
                      </div>
                    )}
                    {task.acordoDetails?.aVista !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">À vista:</span>
                        <span className="font-medium">R$ {task.acordoDetails.aVista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {task.acordoDetails?.parcelado && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelado:</span>
                        <span className="font-medium">
                          R$ {task.acordoDetails.parcelado.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + 
                          {task.acordoDetails.parcelado.quantidadeParcelas}x R$ {task.acordoDetails.parcelado.parcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {task.acordoDetails?.honorarios !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Honorários:</span>
                        <span className="font-medium">R$ {task.acordoDetails.honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {TASK_STATUSES[task.status]}
                </Badge>
                <TaskFilePanel 
                  files={task.files}
                  onUploadFile={handleUploadFile}
                  onDeleteFile={handleDeleteFile}
                />
                <TaskHistoryPanel history={task.history} />
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <h3 className="text-sm font-medium mb-4">Comentários ({task.comments.length})</h3>
              
              {/* Add Comment */}
              <div className="space-y-3 mb-6">
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
              <div className="space-y-4">
                {task.comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      {editingCommentId === comment.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editedCommentText}
                            onChange={(e) => setEditedCommentText(e.target.value)}
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
                              onClick={() => setEditingCommentId(null)} 
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
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm flex-1">{comment.text}</p>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditComment(comment.id)}
                                className="h-6 w-6"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este comentário?
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Por {comment.author} em {format(new Date(comment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {comment.updatedAt > comment.createdAt && " (editado)"}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {task.comments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhum comentário ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;