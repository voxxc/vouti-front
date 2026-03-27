import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const ConditionNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode
      icon={<GitBranch className="h-4 w-4 text-blue-500" />}
      label="Condição"
      color="border-blue-500/60"
      outputs={[
        { id: "true", label: "✓ Sim" },
        { id: "false", label: "✗ Não" },
      ]}
    >
      <div>
        <span className="text-muted-foreground">Mensagem contém:</span>
        <Input
          value={(data as any).contains || ""}
          onChange={(e) => updateConfig("contains", e.target.value)}
          placeholder="Ex: sim, confirmo"
          className="h-7 text-xs mt-1"
        />
      </div>
    </BaseNode>
  );
});

ConditionNode.displayName = "ConditionNode";
