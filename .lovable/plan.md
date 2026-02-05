
# Restaurar Funcionalidade Completa da Agenda no Drawer

## Problema Identificado

O drawer atual da Agenda (`AgendaContent.tsx`) está exibindo apenas o calendário, perdendo toda a riqueza de funcionalidades da página original que inclui:

- Busca de prazos
- Botao "Novo Prazo" para criar prazos
- Cards dos prazos do dia selecionado com detalhes completos
- Cards de resumo: Prazos Vencidos e Proximos Prazos
- Secao de Administrador com filtro por usuario
- Historico de Prazos Cumpridos
- Dialogs para detalhes, conclusao e extensao de prazo

## Conceito Visual

```text
ATUAL (incompleto):                      PROPOSTO (completo):
                                         
┌────────────────────────┐               ┌────────────────────────────────────┐
│ 📅 Agenda              │               │ 📅 Agenda         [🔍] [+ Novo]    │
├────────────────────────┤               ├────────────────────────────────────┤
│                        │               │ ┌────────────────────────────────┐ │
│     JANEIRO 2026       │               │ │      JANEIRO 2026              │ │
│  D  S  T  Q  Q  S  S   │               │ │   D  S  T  Q  Q  S  S          │ │
│  1  2  3  4  5  6  7   │               │ └────────────────────────────────┘ │
│  ...                   │               │                                    │
│                        │               │ ┌──────────────────────────────┐   │
│                        │               │ │ 05/02/2026                   │   │
│                        │               │ │ • Prazo 1 (Joao) ✓           │   │
│                        │               │ │ • Prazo 2 (Maria) ⏱          │   │
│                        │               │ └──────────────────────────────┘   │
│                        │               │                                    │
│                        │               │ ┌─ Vencidos ─┐ ┌─ Proximos ───┐   │
│                        │               │ │ 3 prazos   │ │ 5 prazos     │   │
│                        │               │ └────────────┘ └──────────────┘   │
│                        │               │                                    │
│                        │               │ ┌─ Admin View ───────────────┐     │
│                        │               │ │ Filtrar por usuario...     │     │
│                        │               │ └────────────────────────────┘     │
│                        │               │                                    │
│                        │               │ ┌─ Historico Cumpridos ─────┐      │
│                        │               │ │ Tabela com prazos ok      │      │
│                        │               │ └────────────────────────────┘     │
└────────────────────────┘               └────────────────────────────────────┘
```

## Estrategia de Implementacao

Como a pagina `Agenda.tsx` tem 1725 linhas com muita logica acoplada, a melhor abordagem sera extrair todo o conteudo da pagina (exceto o DashboardLayout e botao Voltar) para o `AgendaContent.tsx`, mantendo a mesma logica e funcionalidade.

---

## Arquivos a Modificar

### 1. `src/components/Agenda/AgendaContent.tsx`

Reescrever completamente para incluir toda a funcionalidade da pagina original:

**O que sera incluido:**
- Estados para busca, deadlines, projects, dialogs, forms
- Todas as funcoes: fetchDeadlines, createDeadline, toggleCompletion, extenderPrazo, etc.
- Hook useAgendaData ja existente sera substituido pela logica completa
- Componentes visuais: Cards de resumo, tabela de cumpridos, secao admin
- Todos os Dialogs: criar prazo, detalhes, confirmar conclusao, estender prazo

**Estrutura do componente:**

```tsx
export function AgendaContent() {
  // ===== Estados =====
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  // ... todos os demais estados

  // ===== Effects e Data Fetching =====
  useEffect(() => { ... }, [user]);
  const fetchDeadlinesAsync = async () => { ... };

  // ===== Handlers =====
  const handleCreateDeadline = async () => { ... };
  const toggleDeadlineCompletion = async () => { ... };
  const handleExtenderPrazo = async () => { ... };
  const handleDeleteDeadline = async () => { ... };

  // ===== Computed Values =====
  const getDeadlinesForDate = (date: Date) => { ... };
  const getOverdueDeadlines = () => { ... };
  const getUpcomingDeadlines = () => { ... };
  const getCompletedDeadlines = () => { ... };

  return (
    <div className="space-y-6">
      {/* Header com busca e botao novo */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search ... />
          <Input ... />
        </div>
        <Dialog>
          <DialogTrigger>
            <Button>+ Novo Prazo</Button>
          </DialogTrigger>
          ...
        </Dialog>
      </div>

      {/* Calendario */}
      <Card>
        <AgendaCalendar ... />
      </Card>

      {/* Prazos do dia selecionado */}
      <Card>
        <CardTitle>{format(selectedDate, "dd/MM/yyyy")}</CardTitle>
        {getDeadlinesForDate(selectedDate).map(...)}
      </Card>

      {/* Cards Vencidos e Proximos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>Prazos Vencidos</Card>
        <Card>Proximos Prazos</Card>
      </div>

      {/* Admin Section (se isAdmin) */}
      {isAdmin && <Card>Visao Administrador...</Card>}

      {/* Historico Cumpridos */}
      <Card>Historico de Prazos Cumpridos...</Card>

      {/* Dialogs */}
      <Dialog>Detalhes do Prazo...</Dialog>
      <AlertDialog>Confirmar Conclusao...</AlertDialog>
      <Dialog>Estender Prazo...</Dialog>
    </div>
  );
}
```

### 2. `src/hooks/useAgendaData.ts`

Manter como fallback opcional, mas a logica principal ficara no componente para manter consistencia com a implementacao original.

---

## Detalhes Tecnicos

### Imports Necessarios

```tsx
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import AgendaCalendar from "./AgendaCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2, UserCheck, Shield, MessageSquare, Scale, FileText, ExternalLink, MoreVertical, CalendarClock } from "lucide-react";
import { DeadlineComentarios } from "./DeadlineComentarios";
import AdvogadoSelector from "@/components/Controladoria/AdvogadoSelector";
import UserTagSelector from "./UserTagSelector";
import { Deadline, DeadlineFormData } from "@/types/agenda";
import { format, isSameDay, isPast, isFuture, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkIfUserIsAdminOrController } from "@/lib/auth-helpers";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";
import { cn } from "@/lib/utils";
import { notifyDeadlineAssigned, notifyDeadlineTagged } from "@/utils/notificationHelpers";
```

### Funcionalidades a Migrar da Pagina Original

1. **Estados** (linhas 52-83 do Agenda.tsx)
2. **Helpers de data** (linhas 87-130)
3. **Data fetching** (linhas 155-313)
4. **Handlers de CRUD** (linhas 376-719)
5. **Handlers admin** (linhas 731-851)
6. **Render do calendario e cards** (linhas 968-1221)
7. **Secao admin** (linhas 1223-1311)
8. **Historico cumpridos** (linhas 1314-1394)
9. **Dialogs** (linhas 1396-1725)

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Calendario | Apenas calendario | Calendario completo |
| Busca | Nao tem | Campo de busca |
| Criar prazo | Nao tem | Botao + Dialog |
| Prazos do dia | Nao tem | Card com lista detalhada |
| Resumo | Nao tem | Cards Vencidos/Proximos |
| Visao Admin | Nao tem | Filtro por usuario |
| Historico | Nao tem | Tabela de cumpridos |
| Acoes | Nenhuma | Concluir, estender, excluir |
| Detalhes | Nao tem | Dialog com tabs info/comentarios |

O drawer tera TODA a funcionalidade da pagina original, mas dentro do contexto de drawer com scroll e animacao fluida.
