import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Mic, MoreVertical, Phone, Video, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WhatsAppConversation, WhatsAppMessage } from "../sections/WhatsAppInbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatPanelProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatPanel = ({ conversation, messages, onSendMessage }: ChatPanelProps) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.messageText}
                </p>
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

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          {newMessage.trim() ? (
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 bg-green-500 hover:bg-green-600"
              onClick={handleSend}
            >
              <Send className="h-5 w-5" />
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
