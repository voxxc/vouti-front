import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Mic, MoreVertical, Phone, Video, MessageSquare, FileText, X, Loader2, Image as ImageIcon } from "lucide-react";
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

  // Fallback: text
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadAndSend = async () => {
    if (!pendingFile) return;
    setIsUploading(true);

    try {
      const ext = pendingFile.file.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const filePath = `${conversation?.contactNumber || 'unknown'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, pendingFile.file, { contentType: pendingFile.file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("message-attachments")
        .getPublicUrl(filePath);

      // Since bucket is private, use signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

      const mediaUrl = signedData?.signedUrl || urlData.publicUrl;
      
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

  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
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
          ))}
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
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <Mic className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
