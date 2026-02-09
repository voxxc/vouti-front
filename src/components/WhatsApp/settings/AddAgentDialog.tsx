import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentAdded: () => void;
}

const roles = [
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "atendente", label: "Atendente" },
];

export const AddAgentDialog = ({ open, onOpenChange, onAgentAdded }: AddAgentDialogProps) => {
  const { tenantId } = useTenantId();
  const [name, setName] = useState("");
  const [role, setRole] = useState("atendente");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Informe o nome do agente");
      return;
    }

    if (!tenantId) {
      toast.error("Tenant não identificado");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("whatsapp_agents")
        .insert({
          tenant_id: tenantId,
          name: name.trim(),
          role,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Agente criado com sucesso!");
      setName("");
      setRole("atendente");
      onOpenChange(false);
      onAgentAdded();
    } catch (error: any) {
      console.error("Erro ao criar agente:", error);
      toast.error("Erro ao criar agente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Agente</DialogTitle>
          <DialogDescription>
            Crie um novo agente para atender via WhatsApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agente</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Daniel"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Agente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
