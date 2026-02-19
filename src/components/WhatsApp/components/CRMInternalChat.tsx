import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { useMessages } from "@/hooks/useMessages";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TenantUser {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface CRMInternalChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CRMInternalChat = ({ open, onOpenChange }: CRMInternalChatProps) => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { messages, sendMessage, markAsRead, getUnreadCount, getUserMessages } = useMessages(user?.id);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Load tenant users
  useEffect(() => {
    if (!tenantId || !open) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .eq("tenant_id", tenantId)
        .neq("user_id", user?.id || "");
      setUsers((data as TenantUser[]) || []);
    };
    load();
  }, [tenantId, open, user?.id]);

  const conversation = selectedUser ? getUserMessages(selectedUser.user_id) : [];

  // Auto-scroll only on new messages
  useEffect(() => {
    if (conversation.length > prevLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = conversation.length;
  }, [conversation]);

  // Mark as read when viewing
  useEffect(() => {
    if (!selectedUser) return;
    conversation
      .filter((m) => m.sender_id === selectedUser.user_id && !m.is_read)
      .forEach((m) => markAsRead(m.id));
  }, [conversation, selectedUser]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedUser.user_id, newMessage.trim());
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof conversation }[] = [];
  conversation.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle>Chat Interno</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* User list */}
          <div className="w-52 border-r border-border flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {users.map((u) => {
                  const unread = getUnreadCount(u.user_id);
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => setSelectedUser(u)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-accent transition-colors",
                        selectedUser?.user_id === u.user_id && "bg-accent"
                      )}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {u.full_name?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate flex-1">{u.full_name || u.email?.split("@")[0]}</span>
                      {unread > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {users.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Nenhum usuário</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {selectedUser.full_name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{selectedUser.full_name || selectedUser.email?.split("@")[0]}</span>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  {groupedMessages.map((group) => (
                    <div key={group.date}>
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {formatDateLabel(group.msgs[0].created_at)}
                        </span>
                      </div>
                      {group.msgs.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={cn("flex mb-1.5", isMine ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] px-3 py-1.5 rounded-lg text-sm",
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              <p className="break-words">{msg.content}</p>
                              <p className={cn("text-[10px] mt-0.5", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {format(new Date(msg.created_at), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 h-9"
                  />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Selecione um usuário para conversar
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
