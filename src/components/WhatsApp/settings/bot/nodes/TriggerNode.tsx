import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import { BaseNode } from "./BaseNode";

const triggerLabels: Record<string, string> = {
  keyword: "Palavra-chave",
  first_message: "Primeira mensagem",
  always: "Sempre",
  schedule: "Agendado",
};

export const TriggerNode = memo(({ data }: NodeProps) => (
  <BaseNode
    icon={<Zap className="h-4 w-4 text-yellow-500" />}
    label="Gatilho"
    color="border-yellow-500/60"
    hasInput={false}
  >
    <div className="text-muted-foreground">
      <span className="font-medium text-foreground">{triggerLabels[(data as any).trigger_type] || "Gatilho"}</span>
      {(data as any).trigger_value && (
        <p className="mt-1 italic">"{(data as any).trigger_value}"</p>
      )}
    </div>
  </BaseNode>
));

TriggerNode.displayName = "TriggerNode";
