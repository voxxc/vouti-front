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
  { value: "atendente", label: "Atendente" },
];

export const AddAgentDialog = ({ open, onOpenChange, onAgentAdded }: AddAgentDialogProps) => {
  const { tenantId } = useTenantId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("atendente");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Informe o nome do agente");
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error("Informe um email válido");
      return;
    }

    if (!tenantId) {
      toast.error("Tenant não identificado");
      return;
    }

    setIsLoading(true);

    try {
      // Verificar se já existe agente com este email no tenant
      const { data: existingAgent } = await supabase
        .from("whatsapp_agents")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingAgent) {
        toast.error("Já existe um agente com este email");
        setIsLoading(false);
        return;
      }

      // Criar agente
      const { data: newAgent, error } = await supabase
        .from("whatsapp_agents")
        .insert({
          tenant_id: tenantId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar role na tabela separada
      if (newAgent) {
        const agentRole = role === 'admin' ? 'admin' : 'atendente';
        await supabase
          .from("whatsapp_agent_roles")
          .insert({
            agent_id: newAgent.id,
            role: agentRole
          });
      }

      toast.success("Agente criado com sucesso!");
      setName("");
      setEmail("");
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
            Crie um novo agente com acesso ao Vouti.Bot
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
            <Label htmlFor="email">Email do Agente *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agente@escritorio.com"
            />
            <p className="text-xs text-muted-foreground">
              O email deve corresponder ao login do usuário no sistema
            </p>
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
