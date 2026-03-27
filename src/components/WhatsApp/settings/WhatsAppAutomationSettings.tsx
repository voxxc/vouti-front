import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Zap, Plus, Trash2, Edit, Clock, Tag, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

interface AutomationRule {
  id: string;
  name: string;
  rule_type: string;
  is_active: boolean;
  config: Record<string, any>;
}

const RULE_TYPES = [
  { value: "auto_reply_schedule", label: "Auto-resposta por horário", icon: Clock, description: "Responder automaticamente fora do expediente" },
  { value: "auto_label", label: "Auto-etiqueta", icon: Tag, description: "Adicionar etiqueta baseado em palavra-chave" },
  { value: "auto_transfer", label: "Auto-transferência", icon: ArrowRightLeft, description: "Transferir conversa por departamento/palavra" },
];

export const WhatsAppAutomationSettings = () => {
  const { tenantId } = useTenantId();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("auto_reply_schedule");
  const [formConfig, setFormConfig] = useState<Record<string, any>>({});

  const fetchRules = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_automation_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    setRules((data as any[]) || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const resetForm = () => { setFormName(""); setFormType("auto_reply_schedule"); setFormConfig({}); };

  const handleCreate = async () => {
    if (!tenantId || !formName.trim()) return;
    const { error } = await supabase.from("whatsapp_automation_rules").insert({
      tenant_id: tenantId, name: formName.trim(), rule_type: formType, config: formConfig,
    } as any);
    if (error) { toast.error("Erro ao criar regra"); return; }
    toast.success("Regra criada");
    setShowCreate(false); resetForm(); fetchRules();
  };

  const handleUpdate = async () => {
    if (!editingRule || !formName.trim()) return;
    const { error } = await supabase.from("whatsapp_automation_rules")
      .update({ name: formName.trim(), rule_type: formType, config: formConfig } as any)
      .eq("id", editingRule);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setEditingRule(null); resetForm(); fetchRules();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("whatsapp_automation_rules").delete().eq("id", id);
    toast.success("Regra excluída"); fetchRules();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("whatsapp_automation_rules").update({ is_active: active } as any).eq("id", id);
    fetchRules();
  };

  const openEdit = (rule: AutomationRule) => {
    setFormName(rule.name); setFormType(rule.rule_type); setFormConfig(rule.config); setEditingRule(rule.id);
  };

  const getRuleIcon = (type: string) => {
    const found = RULE_TYPES.find(r => r.value === type);
    return found ? <found.icon className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
  };

  const renderConfigFields = () => {
    switch (formType) {
      case "auto_reply_schedule":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início do expediente</Label>
                <Input type="time" value={formConfig.start_time || "08:00"} onChange={(e) => setFormConfig({ ...formConfig, start_time: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Fim do expediente</Label>
                <Input type="time" value={formConfig.end_time || "18:00"} onChange={(e) => setFormConfig({ ...formConfig, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mensagem fora do horário</Label>
              <Textarea value={formConfig.message || ""} onChange={(e) => setFormConfig({ ...formConfig, message: e.target.value })} placeholder="Olá! Nosso horário de atendimento é de 08h às 18h..." rows={3} />
            </div>
          </div>
        );
      case "auto_label":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Palavra-chave (na mensagem)</Label>
              <Input value={formConfig.keyword || ""} onChange={(e) => setFormConfig({ ...formConfig, keyword: e.target.value })} placeholder="Ex: orçamento, preço" />
            </div>
            <div>
              <Label className="text-xs">Etiqueta a adicionar</Label>
              <Input value={formConfig.label || ""} onChange={(e) => setFormConfig({ ...formConfig, label: e.target.value })} placeholder="Ex: lead-quente" />
            </div>
          </div>
        );
      case "auto_transfer":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Palavra-chave (na mensagem)</Label>
              <Input value={formConfig.keyword || ""} onChange={(e) => setFormConfig({ ...formConfig, keyword: e.target.value })} placeholder="Ex: suporte, financeiro" />
            </div>
            <div>
              <Label className="text-xs">Transferir para (nome do agente/equipe)</Label>
              <Input value={formConfig.target || ""} onChange={(e) => setFormConfig({ ...formConfig, target: e.target.value })} placeholder="Ex: Equipe Suporte" />
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automação</h1>
            <p className="text-muted-foreground">Regras rápidas para otimizar o atendimento</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Regra
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma regra de automação</h3>
              <p className="text-muted-foreground text-sm mb-4">Crie regras para automatizar ações comuns.</p>
              <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Criar primeira regra
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {getRuleIcon(rule.rule_type)}
                    <div>
                      <span className="font-medium">{rule.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {RULE_TYPES.find(r => r.value === rule.rule_type)?.description || rule.rule_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.is_active} onCheckedChange={(v) => toggleActive(rule.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate || !!editingRule} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingRule(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Automação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Resposta fora do horário" />
              </div>
              <div>
                <Label>Tipo de Regra</Label>
                <Select value={formType} onValueChange={(v) => { setFormType(v); setFormConfig({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {renderConfigFields()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditingRule(null); resetForm(); }}>Cancelar</Button>
              <Button onClick={editingRule ? handleUpdate : handleCreate}>{editingRule ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
