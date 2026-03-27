import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { ArrowRightLeft } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";

export const TransferNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<ArrowRightLeft className="h-4 w-4 text-orange-500" />} label="Transferir p/ Agente" color="border-orange-500/60">
      <Input
        value={(data as any).transfer_message || ""}
        onChange={(e) => updateConfig("transfer_message", e.target.value)}
        placeholder="Mensagem de transferência..."
        className="h-7 text-xs"
      />
    </BaseNode>
  );
});

TransferNode.displayName = "TransferNode";
