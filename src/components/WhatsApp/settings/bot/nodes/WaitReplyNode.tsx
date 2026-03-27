import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Clock } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const WaitReplyNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<Clock className="h-4 w-4 text-sky-500" />} label="Aguardar Resposta" color="border-sky-500/60">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground whitespace-nowrap">Timeout:</span>
        <Input
          type="number"
          value={(data as any).timeout_minutes || 30}
          onChange={(e) => updateConfig("timeout_minutes", parseInt(e.target.value))}
          className="h-7 text-xs w-20"
        />
        <span className="text-muted-foreground">min</span>
      </div>
    </BaseNode>
  );
});

WaitReplyNode.displayName = "WaitReplyNode";
