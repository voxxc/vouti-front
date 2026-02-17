import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Columns3, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  column_order: number;
  is_default: boolean;
  agent_id: string;
}

interface Agent {
  id: string;
  name: string;
}

export const WhatsAppKanbanSettings = () => {
  const { tenantId } = useTenantId();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New column form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [colRes, agentRes] = await Promise.all([
        supabase
          .from("whatsapp_kanban_columns")
          .select("id, name, color, column_order, is_default, agent_id")
          .eq("tenant_id", tenantId)
          .order("column_order"),
        supabase
          .from("whatsapp_agents")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .eq("is_active", true),
      ]);
      setColumns((colRes.data as KanbanColumn[]) || []);
      setAgents(agentRes.data || []);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedAgentId) {
      toast.error("Preencha o nome e selecione o agente");
      return;
    }

    setIsCreating(true);
    try {
      // Get max order for this agent
      const agentCols = columns.filter(c => c.agent_id === selectedAgentId);
      const maxOrder = agentCols.length > 0 ? Math.max(...agentCols.map(c => c.column_order)) : -1;

      const { error } = await supabase.from("whatsapp_kanban_columns").insert({
        tenant_id: tenantId,
        agent_id: selectedAgentId,
        name: newName.trim(),
        color: newColor,
        column_order: maxOrder + 1,
        is_default: false,
      });

      if (error) throw error;

      toast.success("Coluna criada com sucesso!");
      setNewName("");
      setNewColor("#3b82f6");
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao criar coluna");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (col: KanbanColumn) => {
    if (col.is_default) {
      toast.error("Colunas padrão não podem ser excluídas");
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_kanban_columns")
        .delete()
        .eq("id", col.id);

      if (error) throw error;

      toast.success("Coluna excluída");
      loadData();
    } catch {
      toast.error("Erro ao excluir coluna");
    }
  };

  // Group columns by agent
  const columnsByAgent = agents.map(agent => ({
    agent,
    columns: columns.filter(c => c.agent_id === agent.id).sort((a, b) => a.column_order - b.column_order),
  }));

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban CRM</h1>
          <p className="text-muted-foreground">Configure as colunas e regras do seu Kanban</p>
        </div>

        {/* Create new column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Coluna
            </CardTitle>
            <CardDescription>Adicione uma nova etapa ao funil de um agente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Follow-up"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">{newColor}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Agente</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Columns list grouped by agent */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          columnsByAgent.map(({ agent, columns: agentCols }) => (
            <Card key={agent.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Columns3 className="h-4 w-4" />
                  {agent.name}
                  <Badge variant="secondary" className="ml-auto">{agentCols.length} colunas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentCols.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma coluna encontrada.</p>
                ) : (
                  <div className="space-y-2">
                    {agentCols.map(col => (
                      <div key={col.id} className="flex items-center gap-3 p-2 rounded-md border bg-background">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                        <span className="text-sm font-medium flex-1">{col.name}</span>
                        <span className="text-xs text-muted-foreground">Ordem: {col.column_order}</span>
                        {col.is_default ? (
                          <Badge variant="outline" className="text-[10px]">Padrão</Badge>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(col)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
