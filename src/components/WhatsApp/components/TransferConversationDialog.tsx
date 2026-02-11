import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRoundPlus, Loader2 } from "lucide-react";
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

  const handleTransfer = async () => {
    if (!selectedAgent || !currentAgentId) return;

    setIsTransferring(true);
    try {
      // 1. Send transfer message via WhatsApp
      await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          phone: conversation.contactNumber,
          message: `Você está sendo transferido para o Atendente ${selectedAgent.name}`,
          messageType: "text",
          agentName: currentAgentName || undefined,
          agentId: currentAgentId,
        },
      });

      // 2. Reassign messages to new agent
      await supabase
        .from("whatsapp_messages")
        .update({ agent_id: selectedAgent.id } as any)
        .eq("from_number", conversation.contactNumber)
        .eq("agent_id", currentAgentId);

      // 3. Move Kanban card - delete from old agent
      await supabase
        .from("whatsapp_conversation_kanban")
        .delete()
        .eq("phone", conversation.contactNumber)
        .eq("agent_id", currentAgentId);

      // Get first column of new agent
      const { data: cols } = await supabase
        .from("whatsapp_kanban_columns")
        .select("id")
        .eq("agent_id", selectedAgent.id)
        .order("column_order", { ascending: true })
        .limit(1);

      if (cols && cols.length > 0) {
        await supabase.from("whatsapp_conversation_kanban").insert({
          tenant_id: tenantId,
          agent_id: selectedAgent.id,
          phone: conversation.contactNumber,
          column_id: cols[0].id,
          card_order: 0,
        } as any);
      }

      // 4. Find target user_id for notification
      const { data: targetAgentData } = await supabase
        .from("whatsapp_agents")
        .select("email")
        .eq("id", selectedAgent.id)
        .single();

      if (targetAgentData?.email && tenantId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", targetAgentData.email)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (profile?.user_id) {
          // Get current user id
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

      toast.success(`Conversa transferida para ${selectedAgent.name}`);
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

  if (!currentAgentId || agents.length === 0) return null;

  return (
    <>
      {!showSelect ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setShowSelect(true)}
        >
          <UserRoundPlus className="h-4 w-4 mr-2" />
          Atribuir a outro Agente
        </Button>
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
            <Button
              size="sm"
              className="flex-1"
              disabled={!selectedAgentId}
              onClick={() => setShowConfirm(true)}
            >
              Transferir
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa com <strong>{conversation.contactName}</strong> será
              transferida para <strong>{selectedAgent?.name}</strong>.
              <br /><br />
              Uma mensagem automática será enviada ao contato informando sobre a
              transferência, e o novo agente receberá uma notificação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>
              Cancelar
            </AlertDialogCancel>
            <Button onClick={handleTransfer} disabled={isTransferring}>
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                "Confirmar Transferência"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
