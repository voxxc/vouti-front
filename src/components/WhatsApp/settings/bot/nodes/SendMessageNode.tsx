import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Textarea } from "@/components/ui/textarea";

export const SendMessageNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<MessageSquare className="h-4 w-4 text-emerald-500" />} label="Enviar Mensagem" color="border-emerald-500/60">
      <Textarea
        value={(data as any).message || ""}
        onChange={(e) => updateConfig("message", e.target.value)}
        placeholder="Digite a mensagem..."
        rows={2}
        className="text-xs resize-none"
      />
    </BaseNode>
  );
});

SendMessageNode.displayName = "SendMessageNode";
