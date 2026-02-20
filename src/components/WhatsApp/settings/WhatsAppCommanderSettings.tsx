import { useState, useEffect } from "react";
import { Terminal, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Commander {
  id: string;
  phone_number: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function WhatsAppCommanderSettings() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const loadCommanders = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("whatsapp_commanders" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCommanders(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCommanders();
  }, [tenantId]);

  const handleAdd = async () => {
    if (!newPhone.trim() || !tenantId) return;
    setAdding(true);

    // Normalizar telefone
    let phone = newPhone.replace(/\D/g, "");
    if (phone.length === 10 || phone.length === 11) {
      phone = "55" + phone;
    }

    const { error } = await supabase
      .from("whatsapp_commanders" as any)
      .insert({
        tenant_id: tenantId,
        phone_number: phone,
        name: newName.trim() || "Commander",
        is_active: true,
      } as any);

    if (error) {
      if (error.code === "23505") {
        toast.error("Este número já está cadastrado como Commander");
      } else {
        toast.error("Erro ao adicionar Commander");
      }
    } else {
      toast.success("Commander adicionado!");
      setNewPhone("");
      setNewName("");
      loadCommanders();
    }
    setAdding(false);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("whatsapp_commanders" as any)
      .update({ is_active: !isActive } as any)
      .eq("id", id);

    if (!error) {
      setCommanders((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("whatsapp_commanders" as any)
      .delete()
      .eq("id", id);

    if (!error) {
      setCommanders((prev) => prev.filter((c) => c.id !== id));
      toast.success("Commander removido");
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Commander</h2>
          <p className="text-sm text-muted-foreground">
            Central de controle via WhatsApp com IA
          </p>
        </div>
      </div>

      {/* Adicionar novo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Commander</CardTitle>
          <CardDescription>
            Cadastre um número de telefone autorizado a enviar comandos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome (ex: Meu Celular)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Telefone (ex: 5511999999999)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={adding || !newPhone.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commanders Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : commanders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum Commander cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {commanders.map((cmd) => (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{cmd.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cmd.phone_number}
                      </p>
                    </div>
                    <Badge variant={cmd.is_active ? "default" : "secondary"}>
                      {cmd.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cmd.is_active}
                      onCheckedChange={() => handleToggle(cmd.id, cmd.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cmd.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comandos disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Comandos Disponíveis
          </CardTitle>
          <CardDescription>
            Envie mensagens em linguagem natural e a IA interpretará o comando
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="p-2 rounded bg-muted/50">
              <p className="font-medium">📅 Criar Prazo</p>
              <p className="text-muted-foreground text-xs mt-1">
                "Cria um prazo para vencimento dia 10/10/2026 sobre o caso
                1234456, responsável Laura, cliente Havan, fase recursal"
              </p>
            </div>
            <p className="text-xs text-muted-foreground italic mt-3">
              Mais comandos serão adicionados em breve: registrar gastos, enviar
              mensagens, consultar agenda, etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
