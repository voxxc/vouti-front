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
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskFilePanel from "./TaskFilePanel";
import TaskHistoryPanel from "./TaskHistoryPanel";
import CardColorPicker from "./CardColorPicker";
import { notifyCommentAdded } from "@/utils/notificationHelpers";
import { supabase } from "@/integrations/supabase/client";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  currentUser?: User;
  projectId?: string;
}

const TaskModal = ({ task, isOpen, onClose, onUpdateTask, currentUser, projectId }: TaskModalProps) => {
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

  // Load comments, files and history from database
  useEffect(() => {
    if (task && isOpen) {
      loadTaskData();
    }
  }, [task?.id, isOpen]);

  const loadTaskData = async () => {
    if (!task) return;

    try {
      // Load comments
      const { data: comments, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Load files
      const { data: files, error: filesError } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (filesError) throw filesError;

      // Load history
      const { data: history, error: historyError } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Update task with loaded data
      const updatedTask = {
        ...task,
        comments: (comments || []).map(c => ({
          id: c.id,
          text: c.comment_text,
          author: 'Usuário',
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at)
        })),
        files: (files || []).map(f => ({
          id: f.id,
          name: f.file_name,
          url: supabase.storage.from('task-attachments').getPublicUrl(f.file_path).data.publicUrl,
          size: f.file_size,
          type: f.file_type || '',
          uploadedBy: 'Usuário',
          uploadedAt: new Date(f.created_at)
        })),
        history: (history || []).map(h => ({
          id: h.id,
          action: h.action as any,
          details: h.details,
          user: 'Sistema',
          timestamp: new Date(h.created_at)
        }))
      };

      onUpdateTask(updatedTask);
    } catch (error) {
      console.error('Error loading task data:', error);
    }
  };

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

  const handleAddComment = async () => {
    if (newComment.trim() && task && currentUser) {
      try {
        // Insert comment into database
        const { data: insertedComment, error } = await supabase
          .from('task_comments')
          .insert({
            task_id: task.id,
            user_id: currentUser.id,
            comment_text: newComment.trim()
          })
          .select()
          .single();

        if (error) throw error;

        // Create comment object for local state
        const comment: Comment = {
          id: insertedComment.id,
          text: insertedComment.comment_text,
          author: currentUser.name || "Usuário Atual",
          createdAt: new Date(insertedComment.created_at),
          updatedAt: new Date(insertedComment.updated_at)
        };

        // Add history entry
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            user_id: currentUser.id,
            action: 'comment_added',
            details: `Comentário adicionado: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`
          });

        // Update local state
        const updatedTask = {
          ...task,
          comments: [...task.comments, comment],
          updatedAt: new Date()
        };

        onUpdateTask(updatedTask);
        setNewComment("");

        // Send notification about comment
        if (projectId) {
          await notifyCommentAdded(
            projectId,
            task.title,
            currentUser.name,
            task.id
          );
        }

        toast({
          title: "Comentário adicionado",
          description: "Seu comentário foi salvo com sucesso!",
        });
      } catch (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar comentário.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!task || !currentUser) return;

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${task.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Insert file metadata into database
      const { data: insertedFile, error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_id: task.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: currentUser.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create file object for local state
      const taskFile: TaskFile = {
        id: insertedFile.id,
        name: insertedFile.file_name,
        url: urlData.publicUrl,
        size: insertedFile.file_size,
        type: insertedFile.file_type || '',
        uploadedBy: currentUser.name || "Usuário Atual",
        uploadedAt: new Date(insertedFile.created_at)
      };

      // Add history entry
      await supabase
        .from('task_history')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          action: 'file_uploaded',
          details: `Arquivo enviado: ${file.name}`
        });

      // Update local state
      const updatedTask = {
        ...task,
        files: [...task.files, taskFile],
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);

      toast({
        title: "Arquivo enviado",
        description: `${file.name} foi adicionado com sucesso!`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!task || !currentUser) return;

    const file = task.files.find(f => f.id === fileId);
    if (!file) return;

    try {
      // Get file path from database
      const { data: fileData, error: fetchError } = await supabase
        .from('task_files')
        .select('file_path, file_name')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([fileData.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Add history entry
      await supabase
        .from('task_history')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          action: 'file_deleted',
          details: `Arquivo excluído: ${fileData.file_name}`
        });

      // Update local state
      const updatedTask = {
        ...task,
        files: task.files.filter(f => f.id !== fileId),
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);

      toast({
        title: "Arquivo excluído",
        description: `${fileData.file_name} foi removido com sucesso!`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleEditComment = (commentId: string) => {
    const comment = task.comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditedCommentText(comment.text);
    }
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editedCommentText.trim() || !currentUser) return;

    try {
      // Update comment in database
      const { error } = await supabase
        .from('task_comments')
        .update({
          comment_text: editedCommentText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      const updatedComments = task.comments.map(comment =>
        comment.id === commentId
          ? { ...comment, text: editedCommentText.trim(), updatedAt: new Date() }
          : comment
      );

      // Add history entry
      await supabase
        .from('task_history')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          action: 'comment_edited',
          details: 'Comentário editado'
        });

      const updatedTask = {
        ...task,
        comments: updatedComments,
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);
      setEditingCommentId(null);
      setEditedCommentText("");

      toast({
        title: "Comentário atualizado",
        description: "As alterações foram salvas!",
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar comentário.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task || !currentUser) return;

    const comment = task.comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Add history entry
      await supabase
        .from('task_history')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          action: 'comment_deleted',
          details: `Comentário excluído: "${comment.text.slice(0, 50)}${comment.text.length > 50 ? '...' : ''}"`
        });

      // Update local state
      const updatedTask = {
        ...task,
        comments: task.comments.filter(c => c.id !== commentId),
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);

      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir comentário.",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = (color: string) => {
    const updatedTask = {
      ...task,
      cardColor: color as Task['cardColor'],
      updatedAt: new Date()
    };
    
    onUpdateTask(updatedTask);
    
    toast({
      title: "Cor atualizada",
      description: "A cor do card foi alterada!",
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
                <>
                  <CardColorPicker
                    currentColor={task.cardColor || 'default'}
                    onColorChange={handleColorChange}
                  />
                  <Button onClick={handleEditTask} variant="ghost" size="sm" className="gap-1">
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                </>
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