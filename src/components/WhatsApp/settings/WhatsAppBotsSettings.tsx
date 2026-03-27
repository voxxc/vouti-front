import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Plus, Trash2, Edit, Power, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useWhatsAppBotWorkflows, type WorkflowStep } from "@/hooks/useWhatsAppBotWorkflows";
import { WorkflowStepEditor } from "./bot/WorkflowStepEditor";

export const WhatsAppBotsSettings = () => {
  const { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow, fetchSteps, saveSteps } = useWhatsAppBotWorkflows();
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("keyword");
  const [formTriggerValue, setFormTriggerValue] = useState("");

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await createWorkflow({
      name: formName.trim(),
      trigger_type: formTriggerType,
      trigger_value: formTriggerValue.trim() || undefined,
    });
    setShowCreate(false);
    resetForm();
  };

  const handleEdit = (wf: any) => {
    setFormName(wf.name);
    setFormTriggerType(wf.trigger_type);
    setFormTriggerValue(wf.trigger_value || "");
    setEditingWorkflow(wf.id);
  };

  const handleUpdate = async () => {
    if (!editingWorkflow || !formName.trim()) return;
    await updateWorkflow(editingWorkflow, {
      name: formName.trim(),
      trigger_type: formTriggerType,
      trigger_value: formTriggerValue.trim() || null,
    } as any);
    setEditingWorkflow(null);
    resetForm();
  };

  const resetForm = () => {
    setFormName("");
    setFormTriggerType("keyword");
    setFormTriggerValue("");
  };

  const toggleExpand = async (id: string) => {
    if (expandedWorkflow === id) {
      setExpandedWorkflow(null);
      return;
    }
    setExpandedWorkflow(id);
    setLoadingSteps(true);
    const s = await fetchSteps(id);
    setSteps(s);
    setLoadingSteps(false);
  };

  const handleSaveSteps = async (workflowId: string, newSteps: Omit<WorkflowStep, 'id' | 'created_at'>[]) => {
    await saveSteps(workflowId, newSteps);
    const s = await fetchSteps(workflowId);
    setSteps(s);
  };

  const triggerLabels: Record<string, string> = {
    keyword: "Palavra-chave",
    first_message: "Primeira mensagem",
    always: "Sempre",
    schedule: "Agendado",
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bots</h1>
            <p className="text-muted-foreground">Configure workflows de atendimento automático</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Workflow
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : workflows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum workflow criado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Crie um workflow para automatizar o atendimento por mensagens.
              </p>
              <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Criar primeiro workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workflows.map((wf) => (
              <Card key={wf.id} className="overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{wf.name}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {triggerLabels[wf.trigger_type] || wf.trigger_type}
                        </span>
                        {wf.trigger_value && (
                          <span className="text-xs text-muted-foreground">"{wf.trigger_value}"</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={wf.is_active}
                      onCheckedChange={(checked) => updateWorkflow(wf.id, { is_active: checked } as any)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(wf)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteWorkflow(wf.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleExpand(wf.id)}>
                      {expandedWorkflow === wf.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {expandedWorkflow === wf.id && (
                  <div className="border-t p-4 bg-muted/30">
                    {loadingSteps ? (
                      <p className="text-sm text-muted-foreground">Carregando passos...</p>
                    ) : (
                      <WorkflowStepEditor
                        workflowId={wf.id}
                        steps={steps}
                        onSave={(newSteps) => handleSaveSteps(wf.id, newSteps)}
                      />
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showCreate || !!editingWorkflow} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingWorkflow(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWorkflow ? "Editar Workflow" : "Novo Workflow"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Workflow</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Consulta de preços" />
              </div>
              <div>
                <Label>Tipo de Gatilho</Label>
                <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                    <SelectItem value="first_message">Primeira mensagem</SelectItem>
                    <SelectItem value="always">Sempre (todas as mensagens)</SelectItem>
                    <SelectItem value="schedule">Agendado (fora do horário)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formTriggerType === "keyword") && (
                <div>
                  <Label>Palavra-chave ou Regex</Label>
                  <Input value={formTriggerValue} onChange={(e) => setFormTriggerValue(e.target.value)} placeholder="Ex: preço, orçamento" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditingWorkflow(null); resetForm(); }}>Cancelar</Button>
              <Button onClick={editingWorkflow ? handleUpdate : handleCreate}>
                {editingWorkflow ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
