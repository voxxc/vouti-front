

# Ajustes Visuais e Agenda Drawer

## 1. Reduzir barra de progresso do projeto

**Problema**: A barra de progresso ocupa toda a largura disponivel com `flex-1`

**Arquivo**: `src/components/Projects/ProjectsDrawer.tsx`

**Alteracao** (linhas 198-206):

```text
ANTES:
┌──────────────────────────────────┐
│ Projeto Nome                      │
│ Cliente • 5 tarefas               │
│ [████████████████████████] 75%    │  <- barra muito longa
└──────────────────────────────────┘

DEPOIS:
┌──────────────────────────────────┐
│ Projeto Nome                      │
│ Cliente • 5 tarefas               │
│ [████████████] 75%                │  <- barra limitada
└──────────────────────────────────┘
```

Adicionar `max-w-[200px]` na Progress e remover `flex-1`:

```tsx
<div className="flex items-center gap-2">
  <Progress value={stats.progressPercentage} className="h-1.5 max-w-[200px]" />
  <span className="text-xs text-muted-foreground w-8 text-right">
    {stats.progressPercentage}%
  </span>
</div>
```

---

## 2. Criar AgendaDrawer (igual aos outros)

A Agenda atualmente navega direto para `/agenda`. Vou criar um drawer que abre completamente (side="inset") igual ao Reunioes e Controladoria.

### 2.1 Criar arquivo: `src/components/Agenda/AgendaDrawer.tsx`

Seguindo o padrao do ReunioesDrawer e ControladoriaDrawer:

```tsx
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import { AgendaContent } from "./AgendaContent";

interface AgendaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgendaDrawer({ open, onOpenChange }: AgendaDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">Agenda</SheetTitle>
        
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Agenda</span>
        </div>

        {/* Conteudo scrollavel */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <AgendaContent />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 2.2 Criar arquivo: `src/components/Agenda/AgendaContent.tsx`

Componente que encapsula o conteudo da Agenda para reutilizacao:

```tsx
import { AgendaCalendar } from "./AgendaCalendar";

export function AgendaContent() {
  return (
    <div className="space-y-6">
      <AgendaCalendar />
    </div>
  );
}
```

### 2.3 Atualizar: `src/components/Dashboard/DashboardSidebar.tsx`

Adicionar estado e tratamento para o AgendaDrawer:

**Imports**:
```tsx
import { AgendaDrawer } from "@/components/Agenda/AgendaDrawer";
```

**Estado**:
```tsx
const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
```

**Tratamento especial para Agenda** (similar aos outros):
```tsx
if (item.id === 'agenda') {
  return (
    <Button
      key={item.id}
      variant={isActive(item.id) ? "secondary" : "ghost"}
      onMouseEnter={() => handleMouseEnter(item.id)}
      onClick={() => {
        setAgendaDrawerOpen(true);
        setIsMobileOpen(false);
      }}
      className={cn(
        "w-full justify-start gap-3 h-11",
        isCollapsed && "justify-center px-2",
        isActive(item.id) && "bg-primary/10 text-primary hover:bg-primary/20"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon size={20} />
      {!isCollapsed && <span>{item.label}</span>}
    </Button>
  );
}
```

**Drawer no final**:
```tsx
{/* Agenda Drawer */}
<AgendaDrawer open={agendaDrawerOpen} onOpenChange={setAgendaDrawerOpen} />
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Projects/ProjectsDrawer.tsx` | Limitar largura da Progress para `max-w-[200px]` |
| `src/components/Agenda/AgendaDrawer.tsx` | Criar novo arquivo (drawer inset) |
| `src/components/Agenda/AgendaContent.tsx` | Criar novo arquivo (conteudo reutilizavel) |
| `src/components/Dashboard/DashboardSidebar.tsx` | Importar AgendaDrawer, adicionar estado e logica de abertura |

