import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Macro {
  id: string;
  agent_id: string;
  name: string;
  shortcut: string | null;
  message_template: string;
  is_active: boolean;
}

interface Agent {
  id: string;
  name: string;
}

const VARIABLES = [
  { key: "{{nome}}", label: "Nome do contato" },
  { key: "{{telefone}}", label: "Telefone" },
  { key: "{{email}}", label: "Email" },
  { key: "{{saudacao}}", label: "Saudação automática (Bom dia/Boa tarde/Boa noite)" },
];

export const WhatsAppMacrosSettings = () => {
  const { tenantId } = useTenantId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Partial<Macro> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("whatsapp_agents")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");
    setAgents(data || []);
    if (data?.length && !selectedAgentId) {
      setSelectedAgentId(data[0].id);
    }
  }, [tenantId, selectedAgentId]);

  const fetchMacros = useCallback(async () => {
    if (!selectedAgentId || !tenantId) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("whatsapp_macros" as any)
      .select("*")
      .eq("agent_id", selectedAgentId)
      .order("created_at", { ascending: true });
    setMacros((data as any) || []);
    setIsLoading(false);
  }, [selectedAgentId, tenantId]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { fetchMacros(); }, [fetchMacros]);

  const handleSave = async () => {
    if (!editingMacro?.name?.trim() || !editingMacro?.message_template?.trim() || !selectedAgentId || !tenantId) return;

    try {
      if (editingMacro.id) {
        await supabase
          .from("whatsapp_macros" as any)
          .update({
            name: editingMacro.name,
            shortcut: editingMacro.shortcut || null,
            message_template: editingMacro.message_template,
          })
          .eq("id", editingMacro.id);
      } else {
        await supabase
          .from("whatsapp_macros" as any)
          .insert({
            tenant_id: tenantId,
            agent_id: selectedAgentId,
            name: editingMacro.name,
            shortcut: editingMacro.shortcut || null,
            message_template: editingMacro.message_template,
            is_active: true,
          });
      }
      toast.success("Macro salva!");
      setEditingMacro(null);
      setIsCreating(false);
      fetchMacros();
    } catch {
      toast.error("Erro ao salvar macro");
    }
  };

  const handleToggle = async (macro: Macro) => {
    await supabase
      .from("whatsapp_macros" as any)
      .update({ is_active: !macro.is_active })
      .eq("id", macro.id);
    fetchMacros();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("whatsapp_macros" as any).delete().eq("id", id);
    toast.success("Macro removida");
    fetchMacros();
  };

  const insertVariable = (key: string) => {
    if (!editingMacro) return;
    setEditingMacro(prev => ({
      ...prev!,
      message_template: (prev?.message_template || "") + key,
    }));
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Macros</h1>
          <p className="text-muted-foreground">Crie atalhos para ações frequentes por agente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerenciamento de Macros
            </CardTitle>
            <CardDescription>
              Selecione um agente e configure suas macros com variáveis dinâmicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agent Selector */}
            <div className="space-y-2">
              <Label>Agente</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Macro List */}
            {selectedAgentId && (
              <div className="space-y-3">
                {macros.map(macro => (
                  <div key={macro.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Switch checked={macro.is_active} onCheckedChange={() => handleToggle(macro)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{macro.name}</span>
                        {macro.shortcut && (
                          <Badge variant="outline" className="text-[10px]">{macro.shortcut}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{macro.message_template}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setEditingMacro(macro); setIsCreating(false); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => handleDelete(macro.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {!isCreating && !editingMacro && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => { setIsCreating(true); setEditingMacro({ name: "", shortcut: "", message_template: "" }); }}>
                    <Plus className="h-4 w-4" /> Nova Macro
                  </Button>
                )}
              </div>
            )}

            {/* Edit/Create Form */}
            {editingMacro && (
              <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{editingMacro.id ? "Editar Macro" : "Nova Macro"}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingMacro(null); setIsCreating(false); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input value={editingMacro.name || ""} onChange={e => setEditingMacro(prev => ({ ...prev!, name: e.target.value }))} placeholder="Ex: Saudação inicial" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Atalho</Label>
                    <Input value={editingMacro.shortcut || ""} onChange={e => setEditingMacro(prev => ({ ...prev!, shortcut: e.target.value }))} placeholder="Ex: /ola" className="h-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mensagem</Label>
                  <Textarea
                    value={editingMacro.message_template || ""}
                    onChange={e => setEditingMacro(prev => ({ ...prev!, message_template: e.target.value }))}
                    placeholder="{{saudacao}}, {{nome}}! Como posso ajudar?"
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Variáveis disponíveis</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map(v => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title={v.label}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" className="gap-2" onClick={handleSave} disabled={!editingMacro.name?.trim() || !editingMacro.message_template?.trim()}>
                  <Save className="h-4 w-4" /> Salvar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
