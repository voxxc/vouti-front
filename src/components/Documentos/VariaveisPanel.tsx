import { useState } from "react";
import { ChevronRight, ChevronLeft, Variable, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DOCUMENT_VARIABLES } from "@/types/documento";
import { buildVariableMap } from "@/lib/documentVariables";
import type { Cliente } from "@/types/cliente";
import { cn } from "@/lib/utils";

interface VariaveisPanelProps {
  cliente?: Partial<Cliente> | null;
  onInsert: (variable: string) => void;
  onApplyAll?: () => void;
}

export function VariaveisPanel({ cliente, onInsert, onApplyAll }: VariaveisPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const valueMap = cliente ? buildVariableMap(cliente) : null;

  if (collapsed) {
    return (
      <div className="border-l bg-muted/20 flex flex-col items-center py-3 w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(false)}
          title="Expandir variáveis"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Variable className="h-4 w-4 text-muted-foreground mt-2" />
      </div>
    );
  }

  return (
    <aside className="border-l bg-muted/20 w-72 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Variáveis</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(true)}
          title="Recolher"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="px-3 py-2 text-xs text-muted-foreground border-b">
        {cliente
          ? "Clique para inserir. Os valores reais aparecem ao lado."
          : "Vincule um cliente para ver os valores. Clique para inserir."}
      </p>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {DOCUMENT_VARIABLES.map((v) => {
            const value = valueMap?.[v.key];
            const hasValue = value && value !== "_____________";
            return (
              <button
                key={v.key}
                onClick={() => onInsert(v.key)}
                className={cn(
                  "w-full text-left p-2 rounded-md text-xs hover:bg-accent transition-colors group border border-transparent hover:border-border"
                )}
              >
                <div className="font-medium text-foreground">{v.label}</div>
                <div className="text-[10px] font-mono text-muted-foreground truncate">
                  {v.key}
                </div>
                {value && (
                  <div
                    className={cn(
                      "text-[11px] mt-0.5 truncate italic",
                      hasValue ? "text-primary" : "text-muted-foreground/60"
                    )}
                  >
                    → {value}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {cliente && onApplyAll && (
        <div className="p-3 border-t">
          <Button
            onClick={onApplyAll}
            variant="default"
            size="sm"
            className="w-full gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Aplicar definitivamente
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Substitui todas as variáveis pelos valores reais. Irreversível.
          </p>
        </div>
      )}
    </aside>
  );
}