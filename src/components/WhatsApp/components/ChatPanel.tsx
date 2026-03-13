import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Smile, Mic, MoreVertical, MessageSquare, FileText, X, Loader2, CheckCircle, XCircle, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { WhatsAppConversation, WhatsAppMessage } from "../sections/WhatsAppInbox";
import { ConversationTab } from "./ConversationList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmojiPicker } from "./EmojiPicker";
import { getGreeting } from "@/utils/greetingHelper";

interface ChatPanelProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  onSendMessage: (text: string, messageType?: string, mediaUrl?: string) => void;
  ticketStatus?: string;
  onAcceptTicket?: () => void;
  onCloseTicket?: () => void;
  onArchiveTicket?: () => void;
  onUnarchiveTicket?: () => void;
  activeTab?: ConversationTab;
  selectedMacro?: any | null;
  onClearMacro?: () => void;
  agentId?: string | null;
  tenantId?: string | null;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
}

function detectMimeType(file: File): "image" | "audio" | "video" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

const MediaRenderer = ({ message }: { message: WhatsAppMessage }) => {
  const { messageType, mediaUrl, messageText, isFromMe } = message;

  if (!mediaUrl && messageType === "text") {
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {messageText}
      </p>
    );
  }

  if (messageType === "image" && mediaUrl) {
    return (
      <div className="space-y-1">
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={mediaUrl}
            alt="Imagem"
            className="max-w-full rounded-md max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
        {messageText && (
          <p className="text-sm whitespace-pre-wrap break-words">{messageText}</p>
        )}
      </div>
    );
  }

  if (messageType === "audio" && mediaUrl) {
    return (
      <audio controls className="max-w-full" preload="metadata">
        <source src={mediaUrl} />
        Seu navegador não suporta áudio.
      </audio>
    );
  }

  if (messageType === "video" && mediaUrl) {
    return (
      <div className="space-y-1">
        <video controls className="max-w-full rounded-md max-h-64" preload="metadata">
          <source src={mediaUrl} />
          Seu navegador não suporta vídeo.
        </video>
        {messageText && (
          <p className="text-sm whitespace-pre-wrap break-words">{messageText}</p>
        )}
      </div>
    );
  }

  if (messageType === "document" && mediaUrl) {
    return (
      <div className="space-y-1">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
            isFromMe ? "bg-green-600/30 hover:bg-green-600/40" : "bg-muted hover:bg-muted/80"
          )}
        >
          <FileText className="h-5 w-5 shrink-0" />
          <span className="truncate">{messageText || "Documento"}</span>
        </a>
      </div>
    );
  }

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {messageText}
    </p>
  );
};

export const ChatPanel = ({ conversation, messages, onSendMessage, ticketStatus, onAcceptTicket, onCloseTicket, onArchiveTicket, onUnarchiveTicket, activeTab, selectedMacro, onClearMacro, agentId, tenantId, onLoadMore, hasMoreMessages, isLoadingMore }: ChatPanelProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: string; preview?: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const prevMessagesLengthRef = useRef(0);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    if (conversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 50);
    }
    prevMessagesLengthRef.current = 0;
  }, [conversation?.id]);

  useEffect(() => {
    if (messages.length > 0 && prevMessagesLengthRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    } else if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const processMacroText = useCallback((content: string) => {
    if (!conversation) return content;
    let text = content;
    text = text.replace(/\{\{nome\}\}/g, conversation.contactName || "");
    text = text.replace(/\{\{telefone\}\}/g, conversation.contactNumber || "");
    text = text.replace(/\{\{email\}\}/g, `${conversation.contactNumber}@whatsapp.com`);
    text = text.replace(/\{\{saudacao\}\}/g, getGreeting());
    return text;
  }, [conversation]);

  const handleSendMacro = useCallback(() => {
    if (!selectedMacro) return;
    const processedText = processMacroText(selectedMacro.message_template || selectedMacro.content || "");
    if (!processedText.trim()) return;
    onSendMessage(processedText);
    onClearMacro?.();
  }, [selectedMacro, processMacroText, onSendMessage, onClearMacro]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!newMessage.trim() && !pendingFile) return;
    if (pendingFile) {
      handleUploadAndSend();
      return;
    }
    onSendMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite: 100MB");
      return;
    }
    const type = detectMimeType(file);
    const preview = type === "image" ? URL.createObjectURL(file) : undefined;
    setPendingFile({ file, type, preview });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFileAndGetUrl = useCallback(async (file: File | Blob, ext: string): Promise<string> => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = `${conversation?.contactNumber || 'unknown'}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(filePath, file, { contentType: file instanceof File ? file.type : `audio/${ext}` });

    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (signedError || !signedData?.signedUrl) throw signedError || new Error("Failed to get signed URL");
    return signedData.signedUrl;
  }, [conversation?.contactNumber]);

  const handleUploadAndSend = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    try {
      const ext = pendingFile.file.name.split('.').pop() || 'bin';
      const mediaUrl = await uploadFileAndGetUrl(pendingFile.file, ext);
      const caption = newMessage.trim() || (pendingFile.type === "document" ? pendingFile.file.name : "");
      onSendMessage(caption, pendingFile.type, mediaUrl);
      setNewMessage("");
      setPendingFile(null);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const cancelPendingFile = () => {
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    setPendingFile(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);

        if (blob.size < 1000) {
          toast.error("Áudio muito curto");
          resolve();
          return;
        }

        setIsUploading(true);
        try {
          const mediaUrl = await uploadFileAndGetUrl(blob, 'webm');
          onSendMessage("", "audio", mediaUrl);
        } catch (error) {
          console.error("Erro ao enviar áudio:", error);
          toast.error("Erro ao enviar áudio");
        } finally {
          setIsUploading(false);
        }
        resolve();
      };

      mediaRecorderRef.current!.stop();
    });
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const formatDateBadge = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (msgDate.getTime() === today.getTime()) return "Hoje";
      if (msgDate.getTime() === yesterday.getTime()) return "Ontem";
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getMessageDateKey = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    } catch {
      return "";
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
        <span className="text-3xl font-black tracking-tight lowercase text-foreground mb-4">
          vouti<span className="text-[#E11D48]">.</span>crm
        </span>
        <p className="text-muted-foreground text-center text-sm">
          O melhor lugar para seu trabalho.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-green-500/20 text-green-600">
              {conversation.contactName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-foreground">{conversation.contactName}</h3>
            <p className="text-xs text-muted-foreground">{conversation.contactNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(ticketStatus === "waiting" || !ticketStatus) && onAcceptTicket && (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={onAcceptTicket} title="Aceitar Ticket">
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          {ticketStatus === "open" && onCloseTicket && (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onCloseTicket} title="Encerrar Ticket">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {activeTab === "archived" && onUnarchiveTicket ? (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10" onClick={onUnarchiveTicket} title="Desarquivar">
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          ) : (
            ticketStatus && ticketStatus !== "archived" && onArchiveTicket && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={onArchiveTicket} title="Arquivar">
                <Archive className="h-4 w-4" />
              </Button>
            )
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-green-100/50 dark:bg-transparent" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 5 Q22 2 24 5 L26 10 Q24 13 20 13 Q16 13 14 10 Z' fill='%239ca3af' opacity='0.04'/%3E%3Cpath d='M5 25 L10 20 L15 25 L10 30 Z' fill='%239ca3af' opacity='0.03'/%3E%3Ccircle cx='32' cy='28' r='3' fill='%239ca3af' opacity='0.03'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}>
        <div className="space-y-1">
          {hasMoreMessages && onLoadMore && (
            <div className="flex justify-center my-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Carregando...</>
                ) : (
                  "Carregar mensagens anteriores"
                )}
              </Button>
            </div>
          )}
          {messages.map((message, index) => {
            const currentDateKey = getMessageDateKey(message.timestamp);
            const prevDateKey = index > 0 ? getMessageDateKey(messages[index - 1].timestamp) : null;
            const showDateBadge = currentDateKey !== prevDateKey;

            return (
              <div key={message.id}>
                {showDateBadge && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full shadow-sm">
                      {formatDateBadge(message.timestamp)}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "flex mb-1",
                    message.isFromMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
                      message.isFromMe
                        ? "bg-green-500 text-white rounded-br-none"
                        : "bg-card text-foreground rounded-bl-none"
                    )}
                  >
                    <MediaRenderer message={message} />
                    <p
                      className={cn(
                        "text-[10px] mt-1 text-right",
                        message.isFromMe ? "text-green-100" : "text-muted-foreground"
                      )}
                    >
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Pending File Preview */}
      {pendingFile && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-3">
          {pendingFile.preview ? (
            <img src={pendingFile.preview} alt="Preview" className="h-16 w-16 rounded-md object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pendingFile.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(pendingFile.file.size / 1024 / 1024).toFixed(2)} MB · {pendingFile.type}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={cancelPendingFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Macro Confirm Panel */}
      {selectedMacro && (
        <div className="px-4 py-3 border-t border-border bg-accent/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">/{selectedMacro.shortcut} — {selectedMacro.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearMacro}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-background rounded-md px-3 py-2 border">
            {processMacroText(selectedMacro.message_template || selectedMacro.content || "")}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClearMacro}>
              Cancelar
            </Button>
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSendMacro}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
              onClick={cancelRecording}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-foreground">{formatRecordingTime(recordingTime)}</span>
              <span className="text-xs text-muted-foreground">Gravando...</span>
            </div>
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 bg-green-500 hover:bg-green-600"
              onClick={stopRecordingAndSend}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="p-0 w-auto">
                <EmojiPicker
                  agentId={agentId}
                  tenantId={tenantId}
                  onEmojiSelect={handleEmojiSelect}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              onChange={handleFileSelect}
            />
            <Input
              ref={inputRef}
              placeholder={pendingFile ? "Adicione uma legenda..." : "Digite uma mensagem..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isUploading}
            />
            {(newMessage.trim() || pendingFile) ? (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 bg-green-500 hover:bg-green-600"
                onClick={handleSend}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={startRecording}
                disabled={isUploading}
              >
                <Mic className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
