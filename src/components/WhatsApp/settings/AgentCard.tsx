import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Agent {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  isConnected?: boolean;
  instanceId?: string;
}

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export const AgentCard = ({ agent, onClick }: AgentCardProps) => {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    atendente: "Atendente",
    supervisor: "Supervisor",
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/20 text-primary">
              {agent.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{agent.name}</CardTitle>
            <CardDescription className="text-xs">
              {roleLabels[agent.role] || agent.role}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full",
            agent.isConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
          )} />
          <span className="text-xs">
            {agent.isConnected ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
