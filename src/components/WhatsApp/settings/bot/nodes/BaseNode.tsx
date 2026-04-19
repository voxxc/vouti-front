import { memo, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
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
    <div className={cn(
      "rounded-2xl border shadow-md min-w-[220px] max-w-[280px] bg-card/95 backdrop-blur-sm transition-shadow hover:shadow-lg",
      color
    )}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background !rounded-full"
        />
      )}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-t-[15px] border-b border-border/40",
        color.replace("border-", "bg-").replace("/60", "/10")
      )}>
        <span className={cn(
          "shrink-0 flex items-center justify-center w-7 h-7 rounded-xl",
          color.replace("border-", "bg-").replace("/60", "/15")
        )}>
          {icon}
        </span>
        <span className="text-sm font-semibold text-foreground tracking-tight truncate">{label}</span>
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
          className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-background !rounded-full"
          style={outputs.length > 1 ? { left: `${((i + 1) / (outputs.length + 1)) * 100}%` } : undefined}
        />
      ))}
      {outputs.length > 1 && (
        <div className="flex justify-between px-4 pb-1.5 text-[10px] text-muted-foreground">
          {outputs.map((o) => <span key={o.id}>{o.label}</span>)}
        </div>
      )}
    </div>
  );
});

BaseNode.displayName = "BaseNode";
