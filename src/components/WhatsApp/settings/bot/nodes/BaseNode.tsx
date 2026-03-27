import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface BaseNodeProps {
  icon: ReactNode;
  label: string;
  color: string;
  children?: ReactNode;
  hasInput?: boolean;
  outputs?: { id: string; label?: string; position?: number }[];
}

export const BaseNode = memo(({ icon, label, color, children, hasInput = true, outputs = [{ id: "default" }] }: BaseNodeProps) => {
  return (
    <div className={cn("rounded-xl border-2 shadow-lg min-w-[220px] max-w-[280px] bg-background/95 backdrop-blur-sm", color)}>
      {hasInput && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
      )}
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-[10px] border-b", color.replace("border-", "bg-").replace("/60", "/15"))}>
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-semibold text-foreground truncate">{label}</span>
      </div>
      {children && (
        <div className="p-3 space-y-2 text-xs">
          {children}
        </div>
      )}
      {outputs.map((out, i) => (
        <Handle
          key={out.id}
          type="source"
          position={Position.Bottom}
          id={out.id}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
          style={outputs.length > 1 ? { left: `${((i + 1) / (outputs.length + 1)) * 100}%` } : undefined}
        />
      ))}
      {outputs.length > 1 && (
        <div className="flex justify-between px-4 pb-1 text-[10px] text-muted-foreground">
          {outputs.map((o) => <span key={o.id}>{o.label}</span>)}
        </div>
      )}
    </div>
  );
});

BaseNode.displayName = "BaseNode";
