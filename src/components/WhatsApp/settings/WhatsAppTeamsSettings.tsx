import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsersRound, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  created_at: string;
}

export const WhatsAppTeamsSettings = () => {
  const { tenantId } = useTenantId();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadTeams = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_teams")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at");

      if (error) throw error;
      setTeams(data || []);
    } catch {
      toast.error("Erro ao carregar times");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [tenantId]);

  const handleCreate = async () => {
    if (!newTeamName.trim()) {
      toast.error("Informe o nome do time");
      return;
    }
    if (!tenantId) return;

    setIsCreating(true);
    try {
      const { error } = await supabase.from("whatsapp_teams").insert({
        tenant_id: tenantId,
        name: newTeamName.trim(),
      });

      if (error) throw error;

      toast.success("Time criado com sucesso!");
      setNewTeamName("");
      loadTeams();
    } catch {
      toast.error("Erro ao criar time");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    try {
      // Check if any agents are assigned to this team
      const { data: agents } = await supabase
        .from("whatsapp_agents")
        .select("id")
        .eq("team_id", teamId)
        .limit(1);

      if (agents && agents.length > 0) {
        toast.error("Não é possível excluir: existem agentes neste time. Remova-os primeiro.");
        return;
      }

      const { error } = await supabase.from("whatsapp_teams").delete().eq("id", teamId);
      if (error) throw error;

      toast.success("Time excluído");
      loadTeams();
    } catch {
      toast.error("Erro ao excluir time");
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Times</h1>
          <p className="text-muted-foreground">Organize os agentes em times de atendimento</p>
        </div>

        {/* Create team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Time
            </CardTitle>
            <CardDescription>Crie um grupo de agentes para atendimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Nome do Time</Label>
                <Input
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="Ex: Vendas, Suporte, Jurídico..."
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Teams list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Times Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum time cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center gap-3 p-3 rounded-md border bg-background">
                    <UsersRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(team.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(team.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
