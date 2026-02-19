import { useState } from "react";
import { Calendar, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FollowUpSectionProps {
  phone: string;
  tenantId?: string | null;
  agentId?: string | null;
}

export const FollowUpSection = ({ phone, tenantId, agentId }: FollowUpSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!message.trim() || !date || !time) {
      toast.error("Preencha a mensagem, data e hora");
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`);
      if (scheduledAt <= new Date()) {
        toast.error("A data/hora deve ser no futuro");
        setLoading(false);
        return;
      }

      // Normalizar telefone
      let normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length === 10 || normalizedPhone.length === 11) {
        normalizedPhone = "55" + normalizedPhone;
      }

      const { error } = await supabase.from("whatsapp_pending_messages").insert({
        tenant_id: tenantId || null,
        phone: normalizedPhone,
        message: message.trim(),
        scheduled_at: scheduledAt.toISOString(),
        lead_source: "follow_up",
        lead_id: phone,
        status: "pending",
        attempts: 0,
      } as any);

      if (error) throw error;

      toast.success("Follow-up agendado com sucesso!");
      setMessage("");
      setDate("");
      setTime("");
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao agendar follow-up:", error);
      toast.error("Erro ao agendar follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
          Agendar follow-up
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 p-3 rounded-lg border bg-muted/30">
        <div>
          <Label className="text-xs">Mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Olá, tudo bem? Gostaria de dar continuidade..."
            rows={3}
            className="mt-1 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 text-xs h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Hora</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 text-xs h-8"
            />
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={handleSchedule} disabled={loading}>
          <Send className="h-3 w-3 mr-1" />
          {loading ? "Agendando..." : "Agendar Envio"}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};
