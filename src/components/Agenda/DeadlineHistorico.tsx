import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDeadlineHistorico } from "@/hooks/useDeadlineHistorico";

const CAMPO_LABELS: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  date: "Data",
  advogado_responsavel_id: "Responsável",
  deadline_category: "Categoria",
  project_id: "Projeto",
};

const CAMPOS_LONGOS = new Set(["title", "description"]);

function safeDate(s: string) {
  try {
    return format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return s;
  }
}

function ValorBlock({ label, valor }: { label: string; valor: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const txt = valor ?? "(vazio)";
  const longo = txt.length > 180;
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-sm">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="whitespace-pre-wrap break-words">
        {longo && !expanded ? txt.slice(0, 180) + "…" : txt}
      </div>
      {longo && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 mt-1 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Recolher" : "Ver completo"}
        </Button>
      )}
    </div>
  );
}

export function DeadlineHistorico({ deadlineId }: { deadlineId: string }) {
  const { items, loading } = useDeadlineHistorico(deadlineId);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <History className="h-8 w-8 opacity-50" />
        <p>Nenhuma alteração registrada ainda.</p>
        <p className="text-xs">Edições feitas a partir de agora serão registradas aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const label = CAMPO_LABELS[item.campo_alterado] || item.campo_alterado;
        const isLong = CAMPOS_LONGOS.has(item.campo_alterado);
        const isOpen = openIds.has(item.id);

        return (
          <div key={item.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={item.autor_avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {(item.autor_nome || "S").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    <span className="font-medium">{item.autor_nome || "Sistema"}</span>{" "}
                    <span className="text-muted-foreground">alterou</span>{" "}
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{safeDate(item.alterado_em)}</div>
                </div>
              </div>
              {isLong && (
                <Button variant="ghost" size="sm" onClick={() => toggle(item.id)} className="shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {isLong ? (
              isOpen && (
                <div className="grid gap-2 pt-1">
                  <ValorBlock label="Antes" valor={item.valor_anterior} />
                  <ValorBlock label="Depois" valor={item.valor_novo} />
                </div>
              )
            ) : (
              <div className="text-sm flex flex-wrap items-center gap-2 pl-8">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground line-through">
                  {item.valor_anterior || "(vazio)"}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-foreground font-medium">
                  {item.valor_novo || "(vazio)"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}