import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRoundPlus, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WhatsAppConversation } from "../sections/WhatsAppInbox";

interface TransferConversationDialogProps {
  conversation: WhatsAppConversation;
  currentAgentId?: string | null;
  currentAgentName?: string | null;
  tenantId?: string | null;
  onTransferComplete?: () => void;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

type TransferType = "assign" | "transfer";

export const TransferConversationDialog = ({
  conversation,
  currentAgentId,
  currentAgentName,
  tenantId,
  onTransferComplete,
}: TransferConversationDialogProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>("assign");

  // Load agents (excluding current)
  useEffect(() => {
    const loadAgents = async () => {
      if (!tenantId) return;

      let query = supabase
        .from("whatsapp_agents")
        .select("id, name, email")
        .eq("is_active", true)
        .eq("tenant_id", tenantId);

      if (currentAgentId) {
        query = query.neq("id", currentAgentId);
      }

      const { data } = await query;
      setAgents(data || []);
    };
    loadAgents();
  }, [tenantId, currentAgentId]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const transferMessage = (agentName: string) =>
    `_*Você está sendo transferido para ${agentName}*_`;

  const handleReassignAndNotify = async (newAgentId: string) => {
    // Reassign messages to new agent
    await supabase
      .from("whatsapp_messages")
      .update({ agent_id: newAgentId } as any)
      .eq("from_number", conversation.contactNumber)
      .eq("agent_id", currentAgentId);

    // Move Kanban card - delete from old agent
    await supabase
      .from("whatsapp_conversation_kanban")
      .delete()
      .eq("phone", conversation.contactNumber)
      .eq("agent_id", currentAgentId);

    // Get first column of new agent
    const { data: cols } = await supabase
      .from("whatsapp_kanban_columns")
      .select("id")
      .eq("agent_id", newAgentId)
      .order("column_order", { ascending: true })
      .limit(1);

    if (cols && cols.length > 0) {
      await supabase.from("whatsapp_conversation_kanban").insert({
        tenant_id: tenantId,
        agent_id: newAgentId,
        phone: conversation.contactNumber,
        column_id: cols[0].id,
        card_order: 0,
      } as any);
    }

    // Find target user_id for notification
    const { data: targetAgentData } = await supabase
      .from("whatsapp_agents")
      .select("email")
      .eq("id", newAgentId)
      .single();

    if (targetAgentData?.email && tenantId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", targetAgentData.email)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (profile?.user_id) {
        const { data: currentUser } = await supabase.auth.getUser();

        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          tenant_id: tenantId,
          type: "conversation_transferred",
          title: "Nova conversa transferida",
          content: `${currentAgentName || "Um agente"} transferiu a conversa com ${conversation.contactName} para você.`,
          triggered_by_user_id: currentUser?.user?.id || profile.user_id,
        } as any);
      }
    }
  };

  // Atribuir: same instance (current), just reassign in CRM
  const handleAssign = async () => {
    if (!selectedAgent || !currentAgentId) return;

    setIsTransferring(true);
    try {
      // Send message via CURRENT agent's instance (no agentName/agentId prefix)
      await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: conversation.contactNumber,
          message: transferMessage(selectedAgent.name),
          messageType: "text",
        },
      });

      await handleReassignAndNotify(selectedAgent.id);

      toast.success(`Conversa atribuída para ${selectedAgent.name}`);
      setShowConfirm(false);
      setShowSelect(false);
      setSelectedAgentId("");
      onTransferComplete?.();
    } catch (error) {
      console.error("Erro ao atribuir conversa:", error);
      toast.error("Erro ao atribuir conversa");
    } finally {
      setIsTransferring(false);
    }
  };

  // Transferir: new agent's instance (lead sees new number)
  const handleTransferNewInstance = async () => {
    if (!selectedAgent || !currentAgentId) return;

    setIsTransferring(true);
    try {
      // Get new agent's instance credentials
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("zapi_instance_id, zapi_token, zapi_client_token")
        .eq("agent_id", selectedAgent.id)
        .limit(1)
        .maybeSingle();

      if (!instance) {
        toast.error("O agente destino não possui instância WhatsApp configurada.");
        setIsTransferring(false);
        return;
      }

      // Send message via NEW agent's instance
      await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: conversation.contactNumber,
          message: transferMessage(selectedAgent.name),
          messageType: "text",
          instanceId: instance.zapi_instance_id,
          instanceToken: instance.zapi_token,
          clientToken: instance.zapi_client_token || undefined,
        },
      });

      await handleReassignAndNotify(selectedAgent.id);

      toast.success(`Conversa transferida para ${selectedAgent.name} (nova instância)`);
      setShowConfirm(false);
      setShowSelect(false);
      setSelectedAgentId("");
      onTransferComplete?.();
    } catch (error) {
      console.error("Erro ao transferir conversa:", error);
      toast.error("Erro ao transferir conversa");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleConfirm = () => {
    if (transferType === "assign") {
      handleAssign();
    } else {
      handleTransferNewInstance();
    }
  };

  const openConfirm = (type: TransferType) => {
    setTransferType(type);
    setShowConfirm(true);
  };

  if (!currentAgentId || agents.length === 0) return null;

  return (
    <>
      {!showSelect ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowSelect(true)}
          >
            <UserRoundPlus className="h-4 w-4 mr-2" />
            Atribuir a outro Agente
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione o agente..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowSelect(false);
                setSelectedAgentId("");
              }}
            >
              Cancelar
            </Button>
          </div>
          {selectedAgentId && (
            <div className="space-y-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => openConfirm("assign")}
              >
                <UserRoundPlus className="h-4 w-4 mr-2" />
                Atribuir (mesma instância)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => openConfirm("transfer")}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir (outra instância)
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {transferType === "assign"
                ? "Confirmar Atribuição"
                : "Confirmar Transferência"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A conversa com <strong>{conversation.contactName}</strong> será
              {transferType === "assign"
                ? " atribuída"
                : " transferida"}{" "}
              para <strong>{selectedAgent?.name}</strong>.
              <br /><br />
              {transferType === "assign" ? (
                <>
                  A mensagem de transferência será enviada pela <strong>instância atual</strong>.
                  O contato continuará na mesma conversa WhatsApp.
                </>
              ) : (
                <>
                  A mensagem será enviada pela <strong>instância do novo agente</strong>.
                  O contato receberá a mensagem de outro número.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>
              Cancelar
            </AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isTransferring}>
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {transferType === "assign" ? "Atribuindo..." : "Transferindo..."}
                </>
              ) : (
                transferType === "assign"
                  ? "Confirmar Atribuição"
                  : "Confirmar Transferência"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
