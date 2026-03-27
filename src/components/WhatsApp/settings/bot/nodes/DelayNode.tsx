import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Clock } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const DelayNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<Clock className="h-4 w-4 text-amber-500" />} label="Aguardar Tempo" color="border-amber-500/60">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={(data as any).delay_seconds || 5}
          onChange={(e) => updateConfig("delay_seconds", parseInt(e.target.value))}
          className="h-7 text-xs w-20"
        />
        <span className="text-muted-foreground">segundos</span>
      </div>
    </BaseNode>
  );
});

DelayNode.displayName = "DelayNode";
