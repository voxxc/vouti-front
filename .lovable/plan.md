

## Fase 4.4 — Agenda (Calendário + Eventos)

### Causa raiz / Justificativa

Próxima sub-fase pendente. A Agenda usa o `react-day-picker` (via `Calendar` do shadcn) e tem componentes próprios (lista de eventos, modais de prazo, filtros) que ainda têm visual da fase pré-Apple.

### Exploração necessária antes de implementar

Vou ler para mapear a estrutura real:
- `src/components/Agenda/AgendaContent.tsx` (componente raiz compartilhado)
- `src/components/Agenda/` (lista de arquivos: cards de evento, modais, filtros)
- `src/components/ui/calendar.tsx` (já visto — base do react-day-picker)
- Verificar se há `AgendaCalendar`, `EventList`, `DeadlineDialog` ou similares

### O que vai mudar

**1. Header da Agenda (`Agenda.tsx` + `AgendaContent.tsx`)**
- Tipografia `apple-h1` / `apple-subtitle`.
- Botão "Voltar" e ações com estilo refinado (já herda da Fase 2).
- Drawer (`AgendaDrawer.tsx`) com `glass-surface` no header (igual fizemos no Financeiro).

**2. Calendário (`calendar.tsx`)**
- Células de dia com `rounded-xl` (atualmente `rounded-md` implícito).
- `day_today`: pílula `bg-primary/10 text-primary` em vez de `bg-accent`.
- `day_selected`: manter `bg-primary` mas com `rounded-xl`.
- Hover suave nas células (`hover:bg-muted/60`).
- Caption com tipografia mais elegante (font-medium → font-semibold, tracking-tight).
- Nav buttons (chevrons) com `rounded-xl` e hover refinado.

**3. Lista de eventos / prazos**
- Items com `apple-list-item` (rounded-xl, hover suave, divisores leves).
- Badges de status/categoria como pílulas (`rounded-full`, `bg-{cor}/15`).
- Indicadores de prioridade refinados.
- Empty state com `apple-empty`.

**4. Filtros e toolbar**
- Tabs (se houver) com `apple-segmented`.
- Inputs e selects já refinados na Fase 2 — validar.

**5. Modais de criação/edição de prazo**
- Já herdam da Fase 2 (Dialog refinado), validar visual.
- Se tiver header custom, aplicar `glass-surface` + tipografia.

### Arquivos afetados (estimativa, vou confirmar lendo o diretório)

- `src/pages/Agenda.tsx` — header da página standalone.
- `src/components/Agenda/AgendaDrawer.tsx` — header do drawer com glass.
- `src/components/Agenda/AgendaContent.tsx` — layout interno.
- `src/components/ui/calendar.tsx` — refinamento das células e tipografia.
- Possíveis: `EventList`, `DeadlineCard`, `DeadlineDialog` (vou listar antes).

### Impacto

- **UX**: Agenda fica visualmente alinhada com Dashboard/Controladoria/Financeiro. Calendário com aparência iOS Calendar (células arredondadas, "hoje" como pílula sutil). Lista de eventos mais legível.
- **Dados**: zero mudanças.
- **Performance**: imperceptível.
- **Riscos colaterais**:
  - `calendar.tsx` é usado **em todo lugar** (DatePickers em formulários do CRM, Financeiro, Planejador). Mudança visual afeta todos esses pickers — é o objetivo (consistência), mas vou validar que não quebra nenhum layout.
  - Lógica de visibilidade da Agenda (memory `agenda-visibility-logic-non-admin`) e timezone (`parseLocalDate`) **não serão tocadas** — só refinamento visual.
- **Quem é afetado**: todos os usuários do sistema jurídico (Agenda é multi-role) + qualquer formulário com DatePicker.

### Validação

1. `/solvenza/agenda` (página standalone) → header + calendário + lista refinados.
2. Drawer da Agenda (abrir via ícone na sidebar/topbar) → glass header.
3. Abrir DatePicker em outro contexto (ex: criar prazo, criar tarefa no Planejador) → calendário refinado herda corretamente.
4. Dark mode + viewport 390px → contraste e responsividade ok.
5. Outros módulos (Dashboard, Financeiro) → zero regressão visual.

### Próximo passo após aprovação

1. Listar `src/components/Agenda/` pra mapear arquivos exatos.
2. Aplicar refinamentos: `calendar.tsx` → `AgendaDrawer.tsx` → `AgendaContent.tsx` → cards/listas internas.
3. Validar visualmente. Depois sigo pra **Fase 4.1 — Planejador**.

