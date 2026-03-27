import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, MessageSquare, Clock, GitBranch, ArrowRightLeft, Tag, Globe, Variable } from "lucide-react";
import type { WorkflowStep } from "@/hooks/useWhatsAppBotWorkflows";

interface Props {
  workflowId: string;
  steps: WorkflowStep[];
  onSave: (steps: Omit<WorkflowStep, 'id' | 'created_at'>[]) => Promise<void>;
}

const STEP_TYPES = [
  { value: "send_message", label: "Enviar mensagem", icon: MessageSquare },
  { value: "wait_reply", label: "Aguardar resposta", icon: Clock },
  { value: "condition", label: "Condição", icon: GitBranch },
  { value: "transfer_agent", label: "Transferir p/ agente", icon: ArrowRightLeft },
  { value: "add_label", label: "Adicionar etiqueta", icon: Tag },
  { value: "webhook", label: "Chamar webhook", icon: Globe },
  { value: "delay", label: "Aguardar tempo", icon: Clock },
  { value: "set_variable", label: "Definir variável", icon: Variable },
];

export const WorkflowStepEditor = ({ workflowId, steps, onSave }: Props) => {
  const [localSteps, setLocalSteps] = useState<Array<{ step_type: string; config: Record<string, any>; step_order: number }>>(
    steps.map((s) => ({ step_type: s.step_type, config: s.config, step_order: s.step_order }))
  );
  const [saving, setSaving] = useState(false);

  const addStep = (type: string) => {
    setLocalSteps([...localSteps, { step_type: type, config: {}, step_order: localSteps.length }]);
  };

  const removeStep = (index: number) => {
    setLocalSteps(localSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })));
  };

  const updateStepConfig = (index: number, key: string, value: any) => {
    const updated = [...localSteps];
    updated[index] = { ...updated[index], config: { ...updated[index].config, [key]: value } };
    setLocalSteps(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(localSteps.map((s, i) => ({ workflow_id: workflowId, step_type: s.step_type, step_order: i, config: s.config })));
    setSaving(false);
  };

  const getStepIcon = (type: string) => {
    const found = STEP_TYPES.find((t) => t.value === type);
    return found ? <found.icon className="h-4 w-4" /> : null;
  };

  const getStepLabel = (type: string) => STEP_TYPES.find((t) => t.value === type)?.label || type;

  const renderConfigFields = (step: { step_type: string; config: Record<string, any> }, index: number) => {
    switch (step.step_type) {
      case "send_message":
        return (
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              value={step.config.message || ""}
              onChange={(e) => updateStepConfig(index, "message", e.target.value)}
              placeholder="Digite a mensagem..."
              rows={3}
            />
          </div>
        );
      case "wait_reply":
        return (
          <div>
            <Label className="text-xs">Timeout (minutos)</Label>
            <Input
              type="number"
              value={step.config.timeout_minutes || 30}
              onChange={(e) => updateStepConfig(index, "timeout_minutes", parseInt(e.target.value))}
            />
          </div>
        );
      case "condition":
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Condição (mensagem contém)</Label>
              <Input
                value={step.config.contains || ""}
                onChange={(e) => updateStepConfig(index, "contains", e.target.value)}
                placeholder="Ex: sim, confirmo"
              />
            </div>
            <div>
              <Label className="text-xs">Passo se verdadeiro (nº do passo)</Label>
              <Input
                type="number"
                value={step.config.goto_true || ""}
                onChange={(e) => updateStepConfig(index, "goto_true", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Passo se falso (nº do passo)</Label>
              <Input
                type="number"
                value={step.config.goto_false || ""}
                onChange={(e) => updateStepConfig(index, "goto_false", parseInt(e.target.value))}
              />
            </div>
          </div>
        );
      case "transfer_agent":
        return (
          <div>
            <Label className="text-xs">Mensagem de transferência</Label>
            <Input
              value={step.config.transfer_message || ""}
              onChange={(e) => updateStepConfig(index, "transfer_message", e.target.value)}
              placeholder="Transferindo para um atendente..."
            />
          </div>
        );
      case "add_label":
        return (
          <div>
            <Label className="text-xs">Nome da etiqueta</Label>
            <Input
              value={step.config.label || ""}
              onChange={(e) => updateStepConfig(index, "label", e.target.value)}
              placeholder="Ex: lead-quente"
            />
          </div>
        );
      case "webhook":
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">URL do Webhook</Label>
              <Input
                value={step.config.url || ""}
                onChange={(e) => updateStepConfig(index, "url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-xs">Método</Label>
              <Select value={step.config.method || "POST"} onValueChange={(v) => updateStepConfig(index, "method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "delay":
        return (
          <div>
            <Label className="text-xs">Tempo de espera (segundos)</Label>
            <Input
              type="number"
              value={step.config.delay_seconds || 5}
              onChange={(e) => updateStepConfig(index, "delay_seconds", parseInt(e.target.value))}
            />
          </div>
        );
      case "set_variable":
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Nome da variável</Label>
              <Input
                value={step.config.var_name || ""}
                onChange={(e) => updateStepConfig(index, "var_name", e.target.value)}
                placeholder="nome_cliente"
              />
            </div>
            <div>
              <Label className="text-xs">{"Valor (use {{reply}} para última resposta)"}</Label>
              <Input
                value={step.config.var_value || ""}
                onChange={(e) => updateStepConfig(index, "var_value", e.target.value)}
                placeholder="{{reply}}"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Passos do Workflow</h4>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
          <Save className="h-3 w-3" /> {saving ? "Salvando..." : "Salvar passos"}
        </Button>
      </div>

      {localSteps.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum passo adicionado. Adicione passos abaixo.</p>
      ) : (
        <div className="space-y-2">
          {localSteps.map((step, index) => (
            <div key={index} className="border rounded-lg p-3 bg-background space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                  {getStepIcon(step.step_type)}
                  <span className="text-sm font-medium">{getStepLabel(step.step_type)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(index)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              {renderConfigFields(step, index)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        {STEP_TYPES.map((type) => (
          <Button key={type.value} variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => addStep(type.value)}>
            <Plus className="h-3 w-3" /> {type.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
