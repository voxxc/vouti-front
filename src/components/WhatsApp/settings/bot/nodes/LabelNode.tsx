import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Tag } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const LabelNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<Tag className="h-4 w-4 text-purple-500" />} label="Adicionar Etiqueta" color="border-purple-500/60">
      <Input
        value={(data as any).label || ""}
        onChange={(e) => updateConfig("label", e.target.value)}
        placeholder="Ex: lead-quente"
        className="h-7 text-xs"
      />
    </BaseNode>
  );
});

LabelNode.displayName = "LabelNode";
