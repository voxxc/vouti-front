import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Play, Pause, Users, Clock, CheckCircle2, XCircle, Variable } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  batch_size: number;
  interval_minutes: number;
  created_at: string;
  agent_id: string;
  target_column_id: string;
}

interface Agent {
  id: string;
  name: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  agent_id: string;
}

export const WhatsAppCampaigns = () => {
  const { tenantId } = useTenantId();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(4);

  useEffect(() => {
    loadCampaigns();
    loadAgents();
  }, [tenantId]);

  useEffect(() => {
    if (selectedAgentId) {
      loadColumns(selectedAgentId);
    } else {
      setColumns([]);
    }
  }, [selectedAgentId]);

  const loadCampaigns = async () => {
    const query = supabase
      .from("whatsapp_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    const { data } = await query;
    setCampaigns((data as Campaign[]) || []);
  };

  const loadAgents = async () => {
    let query = supabase.from("whatsapp_agents").select("id, name");
    if (tenantId) query = query.eq("tenant_id", tenantId);
    else query = query.is("tenant_id", null);

    const { data } = await query;
    setAgents(data || []);
  };

  const loadColumns = async (agentId: string) => {
    const { data } = await supabase
      .from("whatsapp_kanban_columns")
      .select("id, name, color, agent_id")
      .eq("agent_id", agentId)
      .order("column_order");

    setColumns((data as KanbanColumn[]) || []);
  };

  const insertVariableTag = () => {
    setMessageTemplate((prev) => prev + "{{nome}}");
  };

  const handleCreate = async () => {
    if (!name || !messageTemplate || !selectedAgentId || !selectedColumnId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // 1. Get contacts from the selected kanban column
      const { data: kanbanCards } = await supabase
        .from("whatsapp_conversation_kanban")
        .select("phone")
        .eq("column_id", selectedColumnId)
        .eq("agent_id", selectedAgentId);

      if (!kanbanCards || kanbanCards.length === 0) {
        toast.error("Nenhum contato encontrado nesta coluna");
        setLoading(false);
        return;
      }

      const phones = kanbanCards.map((c) => c.phone);

      // 2. Resolve contact names
      const { data: contacts } = await supabase
        .from("whatsapp_contacts")
        .select("phone, name")
        .in("phone", phones);

      const nameMap = new Map<string, string>();
      contacts?.forEach((c) => nameMap.set(c.phone, c.name));

      // 3. Create campaign
      const { data: campaign, error: campError } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          tenant_id: tenantId,
          agent_id: selectedAgentId,
          name,
          message_template: messageTemplate,
          target_column_id: selectedColumnId,
          batch_size: batchSize,
          interval_minutes: intervalMinutes,
          status: "running",
          total_contacts: phones.length,
          created_by: user.id,
        })
        .select()
        .single();

      if (campError || !campaign) throw campError;

      // 4. Create scheduled messages in batches
      const now = new Date();
      const messages = phones.map((phone, index) => {
        const batchIndex = Math.floor(index / batchSize);
        const scheduledAt = new Date(now.getTime() + batchIndex * intervalMinutes * 60 * 1000);
        const contactName = nameMap.get(phone) || phone;
        const msg = messageTemplate.replace(/\{\{nome\}\}/g, contactName);

        return {
          campaign_id: campaign.id,
          phone,
          contact_name: contactName,
          message: msg,
          status: "pending",
          scheduled_at: scheduledAt.toISOString(),
        };
      });

      const { error: msgError } = await supabase
        .from("whatsapp_campaign_messages")
        .insert(messages);

      if (msgError) throw msgError;

      toast.success(`Campanha criada! ${phones.length} mensagens agendadas.`);
      setIsOpen(false);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
      toast.error("Erro ao criar campanha");
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "running" ? "paused" : "running";

    if (newStatus === "paused") {
      // Cancel pending messages
      await supabase
        .from("whatsapp_campaign_messages")
        .update({ status: "cancelled" })
        .eq("campaign_id", campaign.id)
        .eq("status", "pending");
    } else {
      // Reschedule cancelled messages
      const { data: cancelled } = await supabase
        .from("whatsapp_campaign_messages")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("status", "cancelled");

      if (cancelled && cancelled.length > 0) {
        const now = new Date();
        for (let i = 0; i < cancelled.length; i++) {
          const batchIndex = Math.floor(i / campaign.batch_size);
          const scheduledAt = new Date(now.getTime() + batchIndex * campaign.interval_minutes * 60 * 1000);
          await supabase
            .from("whatsapp_campaign_messages")
            .update({ status: "pending", scheduled_at: scheduledAt.toISOString() })
            .eq("id", cancelled[i].id);
        }
      }
    }

    await supabase
      .from("whatsapp_campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);

    toast.success(newStatus === "paused" ? "Campanha pausada" : "Campanha retomada");
    loadCampaigns();
  };

  const resetForm = () => {
    setName("");
    setMessageTemplate("");
    setSelectedAgentId("");
    setSelectedColumnId("");
    setBatchSize(10);
    setIntervalMinutes(4);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      running: { label: "Enviando", variant: "default" },
      paused: { label: "Pausado", variant: "secondary" },
      completed: { label: "Concluído", variant: "default" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Campanhas em Massa</h2>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da campanha</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Follow-up Janeiro" />
              </div>

              <div>
                <Label>Agente</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o agente" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {columns.length > 0 && (
                <div>
                  <Label>Coluna do Kanban</Label>
                  <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Mensagem</Label>
                  <Button type="button" variant="outline" size="sm" onClick={insertVariableTag}>
                    <Variable className="h-3 w-3 mr-1" />
                    {"{{nome}}"}
                  </Button>
                </div>
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Olá {{nome}}, tudo bem?"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contatos por lote</Label>
                  <Input type="number" min={1} max={50} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Intervalo (min)</Label>
                  <Input type="number" min={1} max={60} value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value))} />
                </div>
              </div>

              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? "Criando..." : "Criar e Iniciar Campanha"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign List */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma campanha criada ainda</p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const progress = campaign.total_contacts > 0
                ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_contacts) * 100)
                : 0;

              return (
                <Card key={campaign.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.status)}
                        {(campaign.status === "running" || campaign.status === "paused") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleCampaignStatus(campaign)}
                          >
                            {campaign.status === "running" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {campaign.total_contacts} contatos
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          {campaign.sent_count} enviados
                        </span>
                        {campaign.failed_count > 0 && (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                            {campaign.failed_count} falhas
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {campaign.batch_size} a cada {campaign.interval_minutes}min
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
