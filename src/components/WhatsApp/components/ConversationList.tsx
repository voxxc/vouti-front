import { useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WhatsAppConversation } from "../sections/WhatsAppInbox";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationWithAgent extends WhatsAppConversation {
  agentId?: string;
  agentName?: string;
}

interface ConversationListProps {
  conversations: ConversationWithAgent[];
  selectedConversation: ConversationWithAgent | null;
  onSelectConversation: (conversation: ConversationWithAgent) => void;
  isLoading: boolean;
  showAgentBadge?: boolean;
}

export const ConversationList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  isLoading,
  showAgentBadge = false,
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contactNumber.includes(searchQuery)
  );

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: false,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 border-r border-border flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border flex flex-col bg-card">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <button
                key={`${conversation.id}-${conversation.agentId || 'no-agent'}`}
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "w-full p-3 rounded-lg flex items-start gap-3 text-left transition-colors",
                  selectedConversation?.id === conversation.id
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-green-500/20 text-green-600 text-sm">
                    {conversation.contactName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {showAgentBadge && conversation.agentName && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                          {conversation.agentName}
                        </Badge>
                      )}
                      <span className="font-medium text-foreground truncate text-sm">
                        {conversation.contactName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-green-500">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
