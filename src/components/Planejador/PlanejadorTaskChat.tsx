import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanejadorTaskChatProps {
  taskId: string;
}

export function PlanejadorTaskChat({ taskId }: PlanejadorTaskChatProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['planejador-messages', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planejador_task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const { error } = await supabase.from('planejador_task_messages').insert({
        task_id: taskId,
        user_id: user.id,
        content,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejador-messages', taskId] });
      setMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message.trim());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Bate-papo da tarefa</span>
        <span className="text-xs text-muted-foreground ml-auto">{messages.length} mensagens</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs opacity-60">Comece a conversar sobre esta tarefa</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                <div className={`rounded-xl px-3 py-2 text-sm ${
                  isOwn 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                  {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite @ ou + para mencionar uma pessoa..."
            className="flex-1 text-sm"
          />
          <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
