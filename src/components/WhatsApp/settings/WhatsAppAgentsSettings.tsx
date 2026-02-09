import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { AgentCard, Agent } from "./AgentCard";
import { AddAgentDialog } from "./AddAgentDialog";
import { AgentConfigDrawer } from "./AgentConfigDrawer";

export const WhatsAppAgentsSettings = () => {
  const { tenantId } = useTenantId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadAgents();
    }
  }, [tenantId]);

  const loadAgents = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      // Buscar agentes
      const { data: agentsData, error: agentsError } = await supabase
        .from("whatsapp_agents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (agentsError) throw agentsError;

      // Buscar instâncias para verificar conexão
      const { data: instancesData } = await supabase
        .from("whatsapp_instances")
        .select("agent_id, connection_status")
        .eq("tenant_id", tenantId);

      const instanceMap = new Map(
        instancesData?.map(i => [i.agent_id, i.connection_status === "connected"]) || []
      );

      const formattedAgents: Agent[] = (agentsData || []).map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        is_active: a.is_active,
        isConnected: instanceMap.get(a.id) || false,
      }));

      setAgents(formattedAgents);
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users2 className="h-6 w-6" />
              Agentes
            </h1>
            <p className="text-muted-foreground">
              Gerencie os agentes e suas configurações Z-API individuais
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Agente
          </Button>
        </div>

        {/* Grid de Agentes */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum agente cadastrado</p>
            <p className="text-sm">Clique em "Adicionar Agente" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onClick={() => setSelectedAgent(agent)}
              />
            ))}
          </div>
        )}

        {/* Dialog para adicionar */}
        <AddAgentDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onAgentAdded={loadAgents}
        />

        {/* Drawer de configurações do agente */}
        <AgentConfigDrawer 
          agent={selectedAgent}
          open={!!selectedAgent}
          onOpenChange={(open) => !open && setSelectedAgent(null)}
          onAgentUpdated={loadAgents}
        />
      </div>
    </div>
  );
};
