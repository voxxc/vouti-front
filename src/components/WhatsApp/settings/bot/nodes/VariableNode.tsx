import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Variable } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const VariableNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<Variable className="h-4 w-4 text-pink-500" />} label="Definir Variável" color="border-pink-500/60">
      <Input
        value={(data as any).var_name || ""}
        onChange={(e) => updateConfig("var_name", e.target.value)}
        placeholder="nome_variável"
        className="h-7 text-xs"
      />
      <Input
        value={(data as any).var_value || ""}
        onChange={(e) => updateConfig("var_value", e.target.value)}
        placeholder="{{reply}}"
        className="h-7 text-xs"
      />
    </BaseNode>
  );
});

VariableNode.displayName = "VariableNode";
