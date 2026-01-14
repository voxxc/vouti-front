import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  MessageSquare, 
  Files, 
  History,
  Send,
  Trash2,
  Upload,
  Download,
  Loader2,
  Edit,
  Save,
  X,
  CheckCircle2,
  Clock,
  Reply,
  Calendar
} from 'lucide-react';
import { ProjectProtocoloEtapa } from '@/hooks/useProjectProtocolos';
import { useEtapaData, EtapaComment } from '@/hooks/useEtapaData';
import { supabase } from '@/integrations/supabase/client';
import { MentionInput } from './MentionInput';
import { CreateDeadlineDialog } from './CreateDeadlineDialog';

interface EtapaModalProps {
  etapa: ProjectProtocoloEtapa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  protocoloId?: string;
  projectId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído'
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  concluido: 'bg-green-500/10 text-green-600 border-green-500/20'
};

export function EtapaModal({
  etapa,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  protocoloId,
  projectId
}: EtapaModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNome, setEditedNome] = useState('');
  const [editedDescricao, setEditedDescricao] = useState('');
  const [newComment, setNewComment] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    comments,
    files,
    history,
    loading,
    fetchData,
    addComment,
    updateComment,
    deleteComment,
    uploadFile,
    deleteFile,
    updateFileDescription,
    addHistoryEntry
  } = useEtapaData(etapa?.id || null);

  const [editingFileDescription, setEditingFileDescription] = useState<string | null>(null);
  const [fileDescriptionText, setFileDescriptionText] = useState('');

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Sincroniza os campos de edição quando a etapa muda (via props atualizadas otimisticamente)
  useEffect(() => {
    if (etapa) {
      setEditedNome(etapa.nome);
      setEditedDescricao(etapa.descricao || '');
    }
  }, [etapa?.nome, etapa?.descricao]);

  // Carrega dados (comentários, arquivos, histórico) apenas ao abrir o modal
  useEffect(() => {
    if (etapa?.id && open) {
      fetchData();
    }
  }, [etapa?.id, open, fetchData]);

  if (!etapa) return null;

  const handleSave = async () => {
    if (!editedNome.trim()) return;
    
    setSaving(true);
    try {
      await onUpdate(etapa.id, {
        nome: editedNome.trim(),
        descricao: editedDescricao.trim() || null
      });
      await addHistoryEntry('Etapa editada', `Nome: ${editedNome.trim()}`);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      await onUpdate(etapa.id, {
        status: newStatus,
        dataConclusao: newStatus === 'concluido' ? new Date() : null
      });
      await addHistoryEntry('Status alterado', `Para: ${STATUS_LABELS[newStatus]}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(etapa.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setDeleteConfirm(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment, undefined, mentionedUserIds);
    setNewComment('');
    setMentionedUserIds([]);
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;
    await addComment(replyText, parentCommentId);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    await updateComment(commentId, editCommentText);
    setEditingComment(null);
    setEditCommentText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (file: { filePath: string; fileName: string }) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(file.filePath, 60, {
          download: file.fileName
        });

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleSaveFileDescription = async (fileId: string) => {
    await updateFileDescription(fileId, fileDescriptionText);
    setEditingFileDescription(null);
    setFileDescriptionText('');
  };

  const renderComment = (comment: EtapaComment, isReply = false) => (
    <div 
      key={comment.id} 
      className={`p-3 rounded-lg bg-muted/50 group ${isReply ? 'ml-6 mt-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {format(comment.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {comment.updatedAt > comment.createdAt && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>
          
          {editingComment === comment.id ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingComment(null);
                  setEditCommentText('');
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.commentText}</p>
          )}
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyText('');
              }}
              title="Responder"
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {currentUserId === comment.userId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setEditingComment(comment.id);
                setEditCommentText(comment.commentText);
              }}
              title="Editar"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => deleteComment(comment.id)}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Escreva sua resposta..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddReply(comment.id)}
          />
          <Button size="sm" onClick={() => handleAddReply(comment.id)} disabled={!replyText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
          {/* Loading Overlay */}
          {saving && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Salvando...</span>
              </div>
            </div>
          )}
          <DialogHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editedNome}
                      onChange={(e) => setEditedNome(e.target.value)}
                      className="text-lg font-semibold"
                      placeholder="Nome da etapa"
                    />
                    <Textarea
                      value={editedDescricao}
                      onChange={(e) => setEditedDescricao(e.target.value)}
                      placeholder="Descrição (opcional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="ml-1">Salvar</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-xl truncate">{etapa.nome}</DialogTitle>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {etapa.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>
                    )}
                  </div>
                )}
              </div>
              <Badge className={STATUS_COLORS[etapa.status]}>
                {STATUS_LABELS[etapa.status]}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="detalhes" className="gap-1.5">
                <FileText className="w-4 h-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Comentários
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="arquivos" className="gap-1.5">
                <Files className="w-4 h-4" />
                Arquivos
                {files.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {files.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 mt-4">
              {/* Detalhes Tab */}
              <TabsContent value="detalhes" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {['pendente', 'em_andamento', 'concluido'].map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={etapa.status === status ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(status)}
                          disabled={saving}
                          className="text-xs"
                        >
                          {status === 'concluido' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {status === 'em_andamento' && <Clock className="h-3 w-3 mr-1" />}
                          {STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {etapa.dataConclusao && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">Concluído em</p>
                      <p className="font-medium">
                        {format(etapa.dataConclusao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Botão Criar Prazo */}
                {protocoloId && (
                  <div>
                    <Button 
                      variant="outline"
                      onClick={() => setShowDeadlineDialog(true)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Criar Prazo
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="pt-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setDeleteConfirm(true)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Etapa
                  </Button>
                </div>
              </TabsContent>

              {/* Comentários Tab */}
              <TabsContent value="comentarios" className="m-0 space-y-4">
                <div className="flex gap-2 items-start">
                  {projectId ? (
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      onMentionsChange={setMentionedUserIds}
                      projectId={projectId}
                      placeholder="Adicionar comentário... Use @ para mencionar"
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      className="flex-1"
                    />
                  ) : (
                    <Input
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                      className="flex-1"
                    />
                  )}
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhum comentário</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => renderComment(comment))}
                  </div>
                )}
              </TabsContent>

              {/* Arquivos Tab */}
              <TabsContent value="arquivos" className="m-0 space-y-4">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Arquivo
                  </Button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Files className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhum arquivo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="p-3 rounded-lg border group space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.uploaderName} • {format(file.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                              {file.fileSize && ` • ${(file.fileSize / 1024).toFixed(1)} KB`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownload(file)}
                              title="Baixar arquivo"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={() => deleteFile(file.id)}
                              title="Excluir arquivo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* File Description */}
                        {editingFileDescription === file.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Adicionar descrição..."
                              value={fileDescriptionText}
                              onChange={(e) => setFileDescriptionText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveFileDescription(file.id);
                                if (e.key === 'Escape') {
                                  setEditingFileDescription(null);
                                  setFileDescriptionText('');
                                }
                              }}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => handleSaveFileDescription(file.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                              setEditingFileDescription(null);
                              setFileDescriptionText('');
                            }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
                            onClick={() => {
                              setEditingFileDescription(file.id);
                              setFileDescriptionText(file.description || '');
                            }}
                          >
                            <Edit className="h-3 w-3" />
                            {file.description ? (
                              <span>{file.description}</span>
                            ) : (
                              <span className="italic">Adicionar descrição...</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Histórico Tab */}
              <TabsContent value="historico" className="m-0 h-full">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma atividade registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="break-words">
                            <span className="font-medium">{entry.userName}</span>
                            <span className="text-muted-foreground"> • {entry.action}</span>
                          </p>
                          {entry.details && (
                            <p className="text-muted-foreground text-xs mt-0.5 break-words">{entry.details}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(entry.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etapa "{etapa.nome}" será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {protocoloId && (
        <CreateDeadlineDialog
          open={showDeadlineDialog}
          onOpenChange={setShowDeadlineDialog}
          etapaId={etapa.id}
          etapaNome={etapa.nome}
          protocoloId={protocoloId}
        />
      )}
    </>
  );
}
