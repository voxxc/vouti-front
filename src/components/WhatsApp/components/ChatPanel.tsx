import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Smile, Mic, MoreVertical, Phone, Video, MessageSquare, FileText, X, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { WhatsAppConversation, WhatsAppMessage } from "../sections/WhatsAppInbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatPanelProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  onSendMessage: (text: string, messageType?: string, mediaUrl?: string) => void;
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

export const ChatPanel = ({ conversation, messages, onSendMessage }: ChatPanelProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: string; preview?: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
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

  // --- Audio Recording ---
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
        // Cleanup
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
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium text-foreground mb-2">WhatsApp Web</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Selecione uma conversa para começar a visualizar as mensagens
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
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
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 5 Q22 2 24 5 L26 10 Q24 13 20 13 Q16 13 14 10 Z' fill='%239ca3af' opacity='0.04'/%3E%3Cpath d='M5 25 L10 20 L15 25 L10 30 Z' fill='%239ca3af' opacity='0.03'/%3E%3Ccircle cx='32' cy='28' r='3' fill='%239ca3af' opacity='0.03'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}>
        <div className="space-y-1">
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

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        {isRecording ? (
          /* Recording UI */
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
          /* Normal input UI */
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
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
