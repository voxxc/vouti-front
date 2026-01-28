import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Edit, Save, X, Plus, Edit2, Trash2, Link2, ListTodo, MessageSquare, Files, History, Loader2, Reply } from "lucide-react";
import { Task, TASK_STATUSES, Comment, TaskFile, TaskHistoryEntry, AcordoDetails } from "@/types/project";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskFilePanel from "./TaskFilePanel";
import TaskHistoryPanel from "./TaskHistoryPanel";
import CardColorPicker from "./CardColorPicker";
import { TaskVinculoTab } from "./TaskVinculoTab";
import { TaskTarefasTab } from "./TaskTarefasTab";
import { notifyCommentAdded } from "@/utils/notificationHelpers";
import { supabase } from "@/integrations/supabase/client";
import { RelatorioUnificado } from "./RelatorioUnificado";
import { useTaskTarefas } from "@/hooks/useTaskTarefas";
import { useTaskVinculo } from "@/hooks/useTaskVinculo";
import { CurrencyInput } from "@/components/ui/currency-input";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onRefreshTask?: (task: Task) => void;
  currentUser?: User;
  projectId?: string;
  columnName?: string;
}

const TaskModal = ({ task, isOpen, onClose, onUpdateTask, onRefreshTask, currentUser, projectId, columnName }: TaskModalProps) => {
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [editedAcordoDetails, setEditedAcordoDetails] = useState<AcordoDetails>({});
  const [activeTab, setActiveTab] = useState("detalhes");
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [processoOabId, setProcessoOabId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const { toast } = useToast();

  const { tarefas: taskTarefas } = useTaskTarefas(task?.id || null, { projectId, taskTitle: task?.title, columnName });
  const { processoVinculado } = useTaskVinculo(task?.id || null, processoOabId);
  const [processoTarefas, setProcessoTarefas] = useState<any[]>([]);

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description);
      setEditedAcordoDetails(task.acordoDetails || {});
    }
  }, [task]);

  // Load task processo_oab_id from database
  useEffect(() => {
    const loadProcessoOabId = async () => {
      if (!task) return;
      
      const { data } = await supabase
        .from('tasks')
        .select('processo_oab_id')
        .eq('id', task.id)
        .single();
      
      if (data?.processo_oab_id) {
        setProcessoOabId(data.processo_oab_id);
      }
    };

    if (task && isOpen) {
      loadProcessoOabId();
      loadTaskData();
    }

    // Reset reply state when modal closes or task changes
    if (!isOpen) {
      setReplyingTo(null);
    }
  }, [task?.id, isOpen]);

  // Real-time subscription for comments
  useEffect(() => {
    if (!task || !isOpen) return;

    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${task.id}`
        },
        () => {
          // Reload task data when comments change
          loadTaskData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task?.id, isOpen]);

  // Buscar tarefas judiciais do processo vinculado
  useEffect(() => {
    const buscarTarefasProcesso = async () => {
      if (!processoOabId) {
        setProcessoTarefas([]);
        return;
      }

      const { data } = await supabase
        .from('processos_oab_tarefas')
        .select('*')
        .eq('processo_oab_id', processoOabId)
        .order('data_execucao', { ascending: false });

      setProcessoTarefas(data || []);
    };

    buscarTarefasProcesso();
  }, [processoOabId]);

  const loadTaskData = async () => {
    if (!task) return;

    try {
      // Buscar comentários com perfil do autor
      const { data: comments, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Buscar perfis dos autores dos comentários
      const commentUserIds = [...new Set((comments || []).map(c => c.user_id))];
      const { data: commentProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', commentUserIds);

      const profileMap = new Map((commentProfiles || []).map(p => [p.user_id, p.full_name]));

      // Buscar arquivos com perfil do uploader
      const { data: files, error: filesError } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (filesError) throw filesError;

      // Buscar perfis dos uploaders
      const fileUserIds = [...new Set((files || []).map(f => f.uploaded_by))];
      const { data: fileProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', fileUserIds);

      const fileProfileMap = new Map((fileProfiles || []).map(p => [p.user_id, p.full_name]));

      // Buscar histórico com perfil do usuário
      const { data: history, error: historyError } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Buscar perfis dos usuários do histórico
      const historyUserIds = [...new Set((history || []).map(h => h.user_id).filter(Boolean))];
      const { data: historyProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', historyUserIds);

      const historyProfileMap = new Map((historyProfiles || []).map(p => [p.user_id, p.full_name]));

      const updatedTask = {
        ...task,
        comments: (comments || []).map(c => ({
          id: c.id,
          text: c.comment_text,
          author: profileMap.get(c.user_id) || 'Usuario',
          userId: c.user_id,
          replyToId: c.reply_to_id || undefined,
          replyToText: c.reply_to_text || undefined,
          replyToAuthor: c.reply_to_author || undefined,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at)
        })),
        files: (files || []).map(f => ({
          id: f.id,
          name: f.file_name,
          url: supabase.storage.from('task-attachments').getPublicUrl(f.file_path).data.publicUrl,
          size: f.file_size,
          type: f.file_type || '',
          uploadedBy: fileProfileMap.get(f.uploaded_by) || 'Usuario',
          uploadedAt: new Date(f.created_at)
        })),
        history: (history || []).map(h => ({
          id: h.id,
          action: h.action as any,
          details: h.details,
          user: h.user_id ? (historyProfileMap.get(h.user_id) || 'Usuario') : 'Sistema',
          timestamp: new Date(h.created_at)
        }))
      };

      // Usar onRefreshTask para apenas atualizar estado local sem registrar histórico
      if (onRefreshTask) {
        onRefreshTask(updatedTask);
      } else {
        onUpdateTask(updatedTask);
      }
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

  const handleSaveTask = async () => {
    if (editedTitle.trim()) {
      // Buscar nome real do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      let userName = 'Usuario';
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        userName = profile?.full_name || user.email || 'Usuario';
      }

      const historyEntry: TaskHistoryEntry = {
        id: `history-${Date.now()}`,
        action: 'edited',
        details: `Tarefa editada`,
        user: userName,
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
      setIsAddingComment(true);
      try {
        const { data: insertedComment, error } = await supabase
          .from('task_comments')
          .insert({
            task_id: task.id,
            user_id: currentUser.id,
            comment_text: newComment.trim(),
            reply_to_id: replyingTo?.id || null,
            reply_to_text: replyingTo?.text?.slice(0, 100) || null,
            reply_to_author: replyingTo?.author || null
          })
          .select()
          .single();

        if (error) throw error;

        const comment: Comment = {
          id: insertedComment.id,
          text: insertedComment.comment_text,
          author: currentUser.name || "Usuario Atual",
          userId: currentUser.id,
          replyToId: replyingTo?.id,
          replyToText: replyingTo?.text?.slice(0, 100),
          replyToAuthor: replyingTo?.author,
          createdAt: new Date(insertedComment.created_at),
          updatedAt: new Date(insertedComment.updated_at)
        };

        const detailsText = columnName 
          ? `Comentário adicionado no card "${task.title}" na coluna "${columnName}": "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`
          : `Comentário adicionado: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`;
        
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'comment_added',
            details: detailsText
          });

        const updatedTask = {
          ...task,
          comments: [...task.comments, comment],
          updatedAt: new Date()
        };

        onUpdateTask(updatedTask);
        setNewComment("");
        setReplyingTo(null);

        if (projectId) {
          await notifyCommentAdded(
            projectId,
            task.title,
            currentUser.name,
            task.id
          );
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar comentario.",
          variant: "destructive",
        });
      } finally {
        setIsAddingComment(false);
      }
    }
  };

  const handleReplyComment = (comment: Comment) => {
    setReplyingTo(comment);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleUploadFile = async (file: File) => {
    if (!task || !currentUser) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${task.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

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

      const taskFile: TaskFile = {
        id: insertedFile.id,
        name: insertedFile.file_name,
        url: urlData.publicUrl,
        size: insertedFile.file_size,
        type: insertedFile.file_type || '',
        uploadedBy: currentUser.name || "Usuario Atual",
        uploadedAt: new Date(insertedFile.created_at)
      };

        const detailsText = columnName 
          ? `Arquivo enviado no card "${task.title}" na coluna "${columnName}": "${file.name}"`
          : `Arquivo enviado: ${file.name}`;
        
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'file_uploaded',
            details: detailsText
          });

      const updatedTask = {
        ...task,
        files: [...task.files, taskFile],
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);
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
      const { data: fileData, error: fetchError } = await supabase
        .from('task_files')
        .select('file_path, file_name')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([fileData.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

        const detailsText = columnName 
          ? `Arquivo excluído do card "${task.title}" na coluna "${columnName}": "${fileData.file_name}"`
          : `Arquivo excluído: ${fileData.file_name}`;
        
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'file_deleted',
            details: detailsText
          });

      const updatedTask = {
        ...task,
        files: task.files.filter(f => f.id !== fileId),
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);
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
      const { error } = await supabase
        .from('task_comments')
        .update({
          comment_text: editedCommentText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      const updatedComments = task.comments.map(comment =>
        comment.id === commentId
          ? { ...comment, text: editedCommentText.trim(), updatedAt: new Date() }
          : comment
      );

        const detailsText = columnName 
          ? `Comentário editado no card "${task.title}" na coluna "${columnName}"`
          : 'Comentário editado';
        
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'comment_edited',
            details: detailsText
          });

      const updatedTask = {
        ...task,
        comments: updatedComments,
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);
      setEditingCommentId(null);
      setEditedCommentText("");
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar comentario.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task || !currentUser) return;

    const comment = task.comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

        const detailsText = columnName 
          ? `Comentário excluído do card "${task.title}" na coluna "${columnName}": "${comment.text.slice(0, 50)}${comment.text.length > 50 ? '...' : ''}"`
          : `Comentário excluído: "${comment.text.slice(0, 50)}${comment.text.length > 50 ? '...' : ''}"`;
        
        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'comment_deleted',
            details: detailsText
          });

      const updatedTask = {
        ...task,
        comments: task.comments.filter(c => c.id !== commentId),
        updatedAt: new Date()
      };

      onUpdateTask(updatedTask);
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir comentario.",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (color: string) => {
    const corAnterior = task.cardColor || 'default';
    
    // Se não houve mudança, não fazer nada
    if (color === corAnterior) return;

    const coresNomes: Record<string, string> = {
      default: 'Padrão', blue: 'Azul', green: 'Verde',
      yellow: 'Amarelo', purple: 'Roxo', pink: 'Rosa',
      orange: 'Laranja', red: 'Vermelho'
    };

    // Registrar mudança de cor no histórico
    if (currentUser && projectId) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', currentUser.id)
          .single();

        await supabase
          .from('task_history')
          .insert({
            task_id: task.id,
            project_id: projectId,
            task_title: task.title,
            user_id: currentUser.id,
            action: 'color_changed',
            details: `Cor do card "${task.title}" alterada de "${coresNomes[corAnterior]}" para "${coresNomes[color]}"`,
            tenant_id: profileData?.tenant_id
          });
      } catch (error) {
        console.error('Error logging color change:', error);
      }
    }

    const updatedTask = {
      ...task,
      cardColor: color as Task['cardColor'],
      updatedAt: new Date()
    };
    
    onUpdateTask(updatedTask);
  };

  const handleVinculoChange = (novoProcessoOabId: string | null) => {
    setProcessoOabId(novoProcessoOabId);
  };

  return (
    <>
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
                    placeholder="Titulo da tarefa"
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="detalhes" className="gap-1 text-xs">
                <Edit className="h-3 w-3" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="vinculo" className="gap-1 text-xs">
                <Link2 className="h-3 w-3" />
                Vinculo
              </TabsTrigger>
              <TabsTrigger value="tarefas" className="gap-1 text-xs">
                <ListTodo className="h-3 w-3" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="arquivos" className="gap-1 text-xs">
                <Files className="h-3 w-3" />
                Arquivos
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1 text-xs">
                <History className="h-3 w-3" />
                Historico
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              <TabsContent value="detalhes" className="mt-0 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Descricao</h3>
                  {isEditingTask ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Descricao da tarefa"
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {task.description || "Nenhuma descricao fornecida"}
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
                            placeholder="Numero do contrato/processo"
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
                          <CurrencyInput
                            value={editedAcordoDetails.valorOriginal}
                            onChange={(value) => setEditedAcordoDetails({
                              ...editedAcordoDetails,
                              valorOriginal: value || undefined
                            })}
                            placeholder="R$ 0,00"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Valor atualizado:</label>
                          <CurrencyInput
                            value={editedAcordoDetails.valorAtualizado}
                            onChange={(value) => setEditedAcordoDetails({
                              ...editedAcordoDetails,
                              valorAtualizado: value || undefined
                            })}
                            placeholder="R$ 0,00"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">A vista:</label>
                          <CurrencyInput
                            value={editedAcordoDetails.aVista}
                            onChange={(value) => setEditedAcordoDetails({
                              ...editedAcordoDetails,
                              aVista: value || undefined
                            })}
                            placeholder="R$ 0,00"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Honorarios:</label>
                          <CurrencyInput
                            value={editedAcordoDetails.honorarios}
                            onChange={(value) => setEditedAcordoDetails({
                              ...editedAcordoDetails,
                              honorarios: value || undefined
                            })}
                            placeholder="R$ 0,00"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium">Parcelado:</label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            <CurrencyInput
                              value={editedAcordoDetails.parcelado?.entrada || 0}
                              onChange={(value) => setEditedAcordoDetails({
                                ...editedAcordoDetails,
                                parcelado: {
                                  ...editedAcordoDetails.parcelado,
                                  entrada: value,
                                  parcelas: editedAcordoDetails.parcelado?.parcelas || 0,
                                  quantidadeParcelas: editedAcordoDetails.parcelado?.quantidadeParcelas || 0
                                }
                              })}
                              placeholder="Entrada"
                              className="text-sm"
                            />
                            <CurrencyInput
                              value={editedAcordoDetails.parcelado?.parcelas || 0}
                              onChange={(value) => setEditedAcordoDetails({
                                ...editedAcordoDetails,
                                parcelado: {
                                  ...editedAcordoDetails.parcelado,
                                  entrada: editedAcordoDetails.parcelado?.entrada || 0,
                                  parcelas: value,
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
                            <span className="text-muted-foreground">A vista:</span>
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
                            <span className="text-muted-foreground">Honorarios:</span>
                            <span className="font-medium">R$ {task.acordoDetails.honorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {TASK_STATUSES[task.status]}
                  </Badge>
                  {processoOabId && (
                    <Badge variant="secondary" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Vinculado
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Comments Section */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Comentarios ({task.comments.length})</h3>
                  
                  <div className="space-y-3 mb-6">
                    {replyingTo && (
                      <div className="bg-muted/50 border-l-2 border-primary p-2 rounded text-xs flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{replyingTo.author}</span>
                          <p className="text-muted-foreground line-clamp-2">{replyingTo.text}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleCancelReply} 
                          className="h-5 w-5 shrink-0 ml-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Textarea
                      placeholder={replyingTo ? "Escreva sua resposta..." : "Adicionar um comentario..."}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button 
                      onClick={handleAddComment} 
                      className="gap-2" 
                      size="sm"
                      disabled={isAddingComment || !newComment.trim()}
                    >
                      {isAddingComment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : replyingTo ? (
                        <Reply className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {isAddingComment ? 'Enviando...' : replyingTo ? 'Responder' : 'Adicionar Comentario'}
                    </Button>
                  </div>

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
                              {/* Reply quote display */}
                              {comment.replyToId && (
                                <div className="bg-muted/30 border-l-2 border-muted-foreground/30 p-2 rounded text-xs mb-2">
                                  <span className="font-medium text-muted-foreground">{comment.replyToAuthor}</span>
                                  <p className="text-muted-foreground line-clamp-1">{comment.replyToText}</p>
                                </div>
                              )}
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-sm flex-1">{comment.text}</p>
                                <div className="flex gap-1 ml-2">
                                  {/* Reply button - always visible */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReplyComment(comment)}
                                    className="h-6 w-6"
                                    title="Responder"
                                  >
                                    <Reply className="h-3 w-3" />
                                  </Button>
                                  {/* Edit/Delete buttons - only for comment owner */}
                                  {currentUser && comment.userId === currentUser.id && (
                                    <>
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
                                            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Tem certeza que deseja excluir este comentario?
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
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{comment.author}</span>
                                {" • "}
                                {format(comment.createdAt, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vinculo" className="mt-0">
                <TaskVinculoTab
                  taskId={task.id}
                  processoOabId={processoOabId}
                  onVinculoChange={handleVinculoChange}
                />
              </TabsContent>

              <TabsContent value="tarefas" className="mt-0">
                <TaskTarefasTab
                  taskId={task.id}
                  taskTitle={task.title}
                  projectId={projectId}
                  columnName={columnName}
                  hasVinculo={!!processoOabId}
                  onGerarRelatorio={() => setRelatorioOpen(true)}
                />
              </TabsContent>

              <TabsContent value="arquivos" className="mt-0">
                <TaskFilePanel 
                  files={task.files}
                  onUploadFile={handleUploadFile}
                  onDeleteFile={handleDeleteFile}
                />
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
                <TaskHistoryPanel history={task.history} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Relatorio Unificado */}
      {processoVinculado && (
        <RelatorioUnificado
          open={relatorioOpen}
          onOpenChange={setRelatorioOpen}
          processo={processoVinculado}
          oab={processoVinculado.oab || null}
          processoTarefas={processoTarefas}
          taskTarefas={taskTarefas}
        />
      )}
    </>
  );
};

export default TaskModal;
