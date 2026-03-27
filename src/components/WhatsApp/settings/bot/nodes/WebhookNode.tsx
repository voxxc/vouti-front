import { memo, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Globe } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const WebhookNode = memo(({ id, data }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const updateConfig = useCallback((key: string, value: any) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  return (
    <BaseNode icon={<Globe className="h-4 w-4 text-teal-500" />} label="Webhook" color="border-teal-500/60">
      <Input
        value={(data as any).url || ""}
        onChange={(e) => updateConfig("url", e.target.value)}
        placeholder="https://..."
        className="h-7 text-xs"
      />
      <Select value={(data as any).method || "POST"} onValueChange={(v) => updateConfig("method", v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="POST">POST</SelectItem>
          <SelectItem value="GET">GET</SelectItem>
        </SelectContent>
      </Select>
    </BaseNode>
  );
});

WebhookNode.displayName = "WebhookNode";
