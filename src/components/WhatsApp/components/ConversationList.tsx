import { useState, useEffect } from "react";
import { Search, MessageSquare, Users, Inbox, CheckCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WhatsAppConversation } from "../sections/WhatsAppInbox";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ConversationTab = "open" | "waiting" | "groups" | "closed";

export interface WhatsAppGroup {
  id: string;
  name: string;
}

interface ConversationWithAgent extends WhatsAppConversation {
  agentId?: string;
  agentName?: string;
  ticketStatus?: string;
  acceptedAt?: string;
}

interface ConversationListProps {
  conversations: ConversationWithAgent[];
  selectedConversation: ConversationWithAgent | null;
  onSelectConversation: (conversation: ConversationWithAgent) => void;
  isLoading: boolean;
  showAgentBadge?: boolean;
  groups?: WhatsAppGroup[];
  onFetchGroups?: () => void;
  isLoadingGroups?: boolean;
  profilePics?: Record<string, string>;
  activeTab?: ConversationTab;
  onTabChange?: (tab: ConversationTab) => void;
  tabCounts?: { open: number; waiting: number; groups: number; closed: number };
}

const TABS: { value: ConversationTab; label: string; icon: React.ElementType }[] = [
  { value: "open", label: "Abertas", icon: MessageSquare },
  { value: "waiting", label: "Fila", icon: Inbox },
  { value: "groups", label: "Grupos", icon: Users },
  { value: "closed", label: "Encerrados", icon: CheckCircle },
];

// 24h countdown component
const TicketCountdown = ({ acceptedAt }: { acceptedAt: string }) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const start = new Date(acceptedAt).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining("00:00");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [acceptedAt]);

  return (
    <span className="text-[10px] text-muted-foreground/70 font-mono flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {remaining}
    </span>
  );
};

export const ConversationList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  isLoading,
  showAgentBadge = false,
  profilePics = {},
  activeTab,
  onTabChange,
  tabCounts = { open: 0, waiting: 0, groups: 0, closed: 0 },
  onFetchGroups,
  isLoadingGroups = false,
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

      {/* Tabs Bar */}
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.value];
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {count > 0 && (
                <span className={cn(
                  "min-w-[16px] h-4 rounded-full text-[10px] flex items-center justify-center px-1",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fetch Groups Button */}
      {activeTab === "groups" && onFetchGroups && (
        <div className="px-3 py-2 border-b border-border">
          <button
            onClick={onFetchGroups}
            disabled={isLoadingGroups}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            {isLoadingGroups ? "Buscando..." : "Buscar Grupos"}
          </button>
        </div>
      )}

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
                  {profilePics[conversation.contactNumber] && (
                    <AvatarImage src={profilePics[conversation.contactNumber]} alt={conversation.contactName} />
                  )}
                  <AvatarFallback className="bg-green-500/20 text-green-600 text-sm">
                    {conversation.contactNumber.includes('@g.us') ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      conversation.contactName.charAt(0).toUpperCase()
                    )}
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
                    <div className="flex items-center gap-1 shrink-0">
                      {conversation.acceptedAt && activeTab === "open" && (
                        <TicketCountdown acceptedAt={conversation.acceptedAt} />
                      )}
                      {conversation.unreadCount > 0 && (
                        <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-green-500">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
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
