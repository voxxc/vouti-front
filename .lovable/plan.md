

# Abrir detalhes do prazo ao clicar no Dashboard

## Situação atual

No `PrazosAbertosPanel`, clicar em um prazo executa `onOpenAgendaDrawer` (abre o drawer da Agenda inteiro) ou navega para a página da Agenda. Não abre os detalhes daquele prazo específico.

## Abordagem

Passar o ID do prazo clicado para o `AgendaDrawer` → `AgendaContent`, que ao carregar os deadlines, detecta o ID recebido e abre automaticamente o dialog de detalhes (`openDeadlineDetails`).

### Alterações

**1. `AgendaDrawer.tsx`** — Aceitar prop opcional `initialDeadlineId?: string` e repassar para `AgendaContent`.

**2. `AgendaContent.tsx`** — Aceitar prop opcional `initialDeadlineId?: string`. Após carregar os deadlines (`fetchDeadlinesAsync`), se o `initialDeadlineId` estiver definido, encontrar o deadline correspondente e chamar `openDeadlineDetails(deadline)` automaticamente (via `useEffect`).

**3. `PrazosAbertosPanel.tsx`** — Em vez de chamar `onOpenAgendaDrawer` direto, guardar o `prazo.id` clicado num state e chamar `onOpenAgendaDrawer(prazoId)`. Ajustar a interface `PrazosAbertosPanelProps` para `onOpenAgendaDrawer?: (deadlineId?: string) => void`.

**4. `AdminMetrics.tsx` e `AdvogadoMetrics.tsx`** — Ajustar o state para guardar o `deadlineId` selecionado e passá-lo ao `AgendaDrawer`:
```
const [agendaDeadlineId, setAgendaDeadlineId] = useState<string | undefined>();

<PrazosAbertosPanel 
  onOpenAgendaDrawer={(id) => { setAgendaDeadlineId(id); setAgendaDrawerOpen(true); }} 
/>
<AgendaDrawer 
  open={agendaDrawerOpen} 
  onOpenChange={(open) => { setAgendaDrawerOpen(open); if (!open) setAgendaDeadlineId(undefined); }}
  initialDeadlineId={agendaDeadlineId}
/>
```

### Arquivos alterados

- `src/components/Agenda/AgendaDrawer.tsx`
- `src/components/Agenda/AgendaContent.tsx`
- `src/components/Dashboard/PrazosAbertosPanel.tsx`
- `src/components/Dashboard/Metrics/AdminMetrics.tsx`
- `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx`

