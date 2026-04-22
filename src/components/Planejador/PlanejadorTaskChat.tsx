import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, User, MessageSquare, Paperclip, Mic, MicOff, X, Reply, Image as ImageIcon, MoreVertical, Trash2, Pencil, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlanejadorTaskChatProps {
  taskId: string;
}

interface ChatMessage {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  tenant_id: string;
  created_at: string;
  edited_at?: string | null;
}

interface TenantProfile {
  user_id: string;
  full_name: string;
}

export function PlanejadorTaskChat({ taskId }: PlanejadorTaskChatProps) {
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  // Fetch profiles for mentions and sender names
  const { data: profiles = [] } = useQuery({
    queryKey: ['tenant-profiles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return (data || []) as TenantProfile[];
    },
    enabled: !!tenantId,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['planejador-messages', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planejador_task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    refetchInterval: 5000,
  });

  const getProfileName = useCallback((userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.full_name || 'Usuário';
  }, [profiles]);

  const filteredMentions = mentionQuery !== null
    ? profiles.filter(p =>
        p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) &&
        p.user_id !== user?.id
      ).slice(0, 5)
    : [];

  // Delete message mutation
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from('planejador_task_messages')
        .delete()
        .eq('id', messageId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Sem permissão para apagar esta mensagem');
      }
    },
    onMutate: async (messageId: string) => {
      await queryClient.cancelQueries({ queryKey: ['planejador-messages', taskId] });
      const previous = queryClient.getQueryData<ChatMessage[]>(['planejador-messages', taskId]);
      queryClient.setQueryData<ChatMessage[]>(
        ['planejador-messages', taskId],
        (old) => (old || []).filter((m) => m.id !== messageId)
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Mensagem apagada");
    },
    onError: (_err, _id, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['planejador-messages', taskId], context.previous);
      }
      toast.error("Erro ao apagar mensagem");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-messages', taskId] });
    },
  });

  // Update (edit) message mutation
  const updateMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Sem permissão para editar esta mensagem');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-messages', taskId] });
      setEditingMessageId(null);
      setEditingContent("");
      toast.success("Mensagem editada");
    },
    onError: () => {
      toast.error("Erro ao editar mensagem");
    },
  });

  const startEditing = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const saveEditing = () => {
    if (!editingMessageId || !editingContent.trim()) return;
    updateMessage.mutate({ messageId: editingMessageId, content: editingContent.trim() });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (params: {
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    }) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const { error } = await supabase.from('planejador_task_messages').insert({
        task_id: taskId,
        user_id: user.id,
        content: params.content,
        message_type: params.messageType || 'text',
        file_url: params.fileUrl || null,
        file_name: params.fileName || null,
        reply_to_id: replyingTo?.id || null,
        tenant_id: tenantId,
      });
      if (error) throw error;

      // Parse @mentions from content
      const mentionedUserIds = new Set<string>();
      if (params.messageType === 'text' || !params.messageType) {
        const mentionRegex = /@([^\s@][^\n@]*?)(?=\s|$|@)/g;
        let m: RegExpExecArray | null;
        while ((m = mentionRegex.exec(params.content)) !== null) {
          const name = m[1].trim();
          // Try exact full_name match (longest first)
          const candidates = profiles
            .filter(p => p.user_id !== user.id)
            .sort((a, b) => (b.full_name?.length || 0) - (a.full_name?.length || 0));
          const matched = candidates.find(p =>
            p.full_name && (name === p.full_name || name.startsWith(p.full_name + ' ') || name.startsWith(p.full_name))
          );
          if (matched) mentionedUserIds.add(matched.user_id);
        }
      }

      // Send notifications to all participants + owner (except sender + mentioned)
      try {
        // Get task info
        const { data: taskData } = await (supabase as any)
          .from('planejador_tasks')
          .select('proprietario_id, titulo')
          .eq('id', taskId)
          .single();
        
        // Get participants
        const { data: participantsData } = await (supabase as any)
          .from('planejador_task_participants')
          .select('user_id')
          .eq('task_id', taskId);

        const recipientIds = new Set<string>();
        if (taskData?.proprietario_id && taskData.proprietario_id !== user.id) {
          recipientIds.add(taskData.proprietario_id);
        }
        (participantsData || []).forEach((p: any) => {
          if (p.user_id !== user.id) recipientIds.add(p.user_id);
        });

        const senderName = profiles.find(p => p.user_id === user.id)?.full_name || 'Alguém';
        const truncatedMsg = params.content.length > 60 ? params.content.slice(0, 57) + '...' : params.content;
        const taskTitle = taskData?.titulo || 'Tarefa';

        const allNotifications: any[] = [];

        // Direct mention notifications (priority — overrides generic chat notif for that user)
        mentionedUserIds.forEach(uid => {
          allNotifications.push({
            user_id: uid,
            tenant_id: tenantId,
            type: 'comment_mention',
            title: `Você foi mencionado em uma tarefa do Planejador: ${taskTitle}`,
            content: `${senderName}: "${truncatedMsg}"`,
            related_task_id: taskId,
            triggered_by_user_id: user.id,
          });
          // Remove from generic chat recipients to avoid double notification
          recipientIds.delete(uid);
        });

        // Generic chat notification for remaining recipients
        recipientIds.forEach(uid => {
          allNotifications.push({
            user_id: uid,
            tenant_id: tenantId,
            type: 'planejador_chat_message',
            title: `Mensagem no Planejador: ${taskTitle}`,
            content: `${senderName}: "${truncatedMsg}"`,
            related_task_id: taskId,
            triggered_by_user_id: user.id,
          });
        });

        if (allNotifications.length > 0) {
          await supabase.from('notifications').insert(allNotifications);
        }
      } catch (notifErr) {
        console.error('Error sending chat notifications:', notifErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-messages', taskId] });
      setMessage("");
      setReplyingTo(null);
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect @ mentions in input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery(null);
    }
  };

  const insertMention = (profile: TenantProfile) => {
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const textBeforeCursor = message.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);

    if (mentionMatch) {
      const startIndex = textBeforeCursor.lastIndexOf('@');
      const before = message.slice(0, startIndex);
      const after = message.slice(cursorPos);
      const newMessage = `${before}@${profile.full_name} ${after}`;
      setMessage(newMessage);
    }
    setShowMentions(false);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMentions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ content: message.trim() });
  };

  // Shared image/file upload logic
  const uploadFile = async (file: File) => {
    if (!user) return;

    const ext = file.name.split('.').pop() || 'png';
    const path = `${user.id}/${taskId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('planejador-chat-files')
      .upload(path, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error("Erro ao enviar arquivo");
      return;
    }

    const { data: urlData } = supabase.storage
      .from('planejador-chat-files')
      .getPublicUrl(path);

    const isImage = file.type.startsWith('image/');
    sendMessage.mutate({
      content: isImage ? '📷 Foto' : `📎 ${file.name}`,
      messageType: isImage ? 'image' : 'file',
      fileUrl: urlData.publicUrl,
      fileName: file.name,
    });
  };

  // File upload via input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Paste image from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length > 0) {
      e.preventDefault();
      for (const img of images) {
        await uploadFile(img);
      }
    }
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    if (!user) return;
    const path = `${user.id}/${taskId}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('planejador-chat-files')
      .upload(path, blob, { contentType: 'audio/webm' });

    if (uploadError) {
      console.error('Audio upload error:', uploadError);
      toast.error("Erro ao enviar áudio");
      return;
    }

    const { data: urlData } = supabase.storage
      .from('planejador-chat-files')
      .getPublicUrl(path);

    sendMessage.mutate({
      content: '🎤 Áudio',
      messageType: 'audio',
      fileUrl: urlData.publicUrl,
      fileName: 'audio.webm',
    });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getReplyContent = (replyToId: string) => {
    const msg = messages.find(m => m.id === replyToId);
    return msg?.content || '';
  };

  // Render @mentions highlighted as chips with guaranteed contrast.
  // Iterates over known profile names (longest first) to robustly match
  // names with multiple spaces (e.g. "@Maria da Silva Santos").
  const renderContent = (content: string, isOwn: boolean = false) => {
    if (!content) return null;

    const names = profiles
      .map(p => p.full_name)
      .filter((n): n is string => !!n)
      .sort((a, b) => b.length - a.length);

    const nodes: React.ReactNode[] = [];
    let i = 0;
    let buffer = '';
    let key = 0;

    const flushBuffer = () => {
      if (buffer) {
        nodes.push(<span key={`t-${key++}`}>{buffer}</span>);
        buffer = '';
      }
    };

    const mentionClass = isOwn
      ? "bg-primary-foreground/20 text-primary-foreground font-semibold px-1 rounded"
      : "bg-primary/10 text-primary font-medium px-1 rounded";

    while (i < content.length) {
      if (content[i] === '@') {
        const rest = content.slice(i + 1);
        const match = names.find(n => rest.startsWith(n));
        if (match) {
          flushBuffer();
          nodes.push(
            <span key={`m-${key++}`} className={mentionClass}>
              @{match}
            </span>
          );
          i += 1 + match.length;
          continue;
        }
      }
      buffer += content[i];
      i++;
    }
    flushBuffer();
    return nodes;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2 bg-background/60 backdrop-blur-sm">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold tracking-tight">Bate-papo da tarefa</span>
        <span className="text-[11px] text-muted-foreground ml-auto px-2 py-0.5 rounded-full bg-muted/60">{messages.length}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20 dark:bg-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium tracking-tight">Nenhuma mensagem ainda</p>
            <p className="text-xs opacity-60 mt-0.5">Comece a conversar sobre esta tarefa</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                {/* Sender name */}
                <span className={cn("text-[10px] font-medium mb-0.5 inline-block", isOwn ? "text-primary" : "text-muted-foreground")}>
                  {getProfileName(msg.user_id)}
                </span>

                <div className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm relative shadow-sm",
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-tr-md'
                    : 'bg-background border border-border/60 rounded-tl-md'
                )}>
                  {/* Reply quote */}
                  {msg.reply_to_id && (
                    <div className={cn(
                      "mb-1.5 p-1.5 rounded text-xs border-l-2",
                      isOwn
                        ? "bg-primary-foreground/10 border-primary-foreground/50"
                        : "bg-background/50 border-muted-foreground/50"
                    )}>
                      <div className="flex items-center gap-1 mb-0.5 opacity-70">
                        <Reply className="h-3 w-3" />
                        <span>Respondendo</span>
                      </div>
                      <p className="truncate italic">{renderContent(getReplyContent(msg.reply_to_id), isOwn)}</p>
                    </div>
                  )}

                  {/* Image */}
                  {msg.message_type === 'image' && msg.file_url && (
                    <div onClick={() => setPreviewImage(msg.file_url)} className="block mb-1 cursor-pointer">
                      <img
                        src={msg.file_url}
                        alt={msg.file_name || 'Foto'}
                        className="rounded-lg max-w-full max-h-48 object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}

                  {/* Audio */}
                  {msg.message_type === 'audio' && msg.file_url && (
                    <audio controls className="max-w-full mb-1" style={{ height: 36 }}>
                      <source src={msg.file_url} type="audio/webm" />
                    </audio>
                  )}

                  {/* Text content (with inline edit mode) */}
                  {msg.message_type === 'text' && (
                    editingMessageId === msg.id ? (
                      <div className="space-y-2 min-w-[200px]">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEditing();
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          autoFocus
                          rows={2}
                          className="text-sm bg-background text-foreground min-h-[60px] resize-none"
                        />
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={cancelEditing}>
                            Cancelar
                          </Button>
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={saveEditing} disabled={!editingContent.trim()}>
                            <Check className="h-3 w-3 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{renderContent(msg.content, isOwn)}</p>
                    )
                  )}
                  {msg.message_type !== 'text' && msg.message_type !== 'image' && msg.message_type !== 'audio' && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {/* Reply button */}
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                    title="Responder"
                  >
                    <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {/* 3-dot menu for own messages */}
                  {isOwn && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted",
                            isOwn ? "-left-16" : "-right-8"
                          )}
                          title="Opções"
                        >
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[160px]">
                        {msg.message_type === 'text' && (
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => startEditing(msg)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar mensagem
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => deleteMessage.mutate(msg.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Apagar mensagem
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                  {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {msg.edited_at && <span className="italic ml-1 opacity-70">(editado)</span>}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 pt-2 flex items-center gap-2 border-t border-border bg-muted/50">
          <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Respondendo a {getProfileName(replyingTo.user_id)}</p>
            <p className="text-sm truncate">{renderContent(replyingTo.content, false)}</p>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mentions popup */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="mx-3 mb-1 border border-border rounded-lg bg-popover shadow-md max-h-40 overflow-y-auto">
          {filteredMentions.map((p, i) => (
            <button
              key={p.user_id}
              onClick={() => insertMention(p)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent",
                i === mentionIndex && "bg-accent"
              )}
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {p.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-border/60 bg-background/60 backdrop-blur-sm">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={cancelRecording} className="text-destructive">
              <X className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive font-medium">
                Gravando {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button size="icon" onClick={stopRecording}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx"
              className="hidden"
            />
            <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Digite @ para mencionar... (Shift+Enter para nova linha)"
              rows={1}
              className="flex-1 text-sm min-h-[40px] max-h-32 resize-none py-2"
            />
            {message.trim() ? (
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" onClick={startRecording}>
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            className="absolute top-4 right-4 text-white hover:text-white/80 z-50"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
