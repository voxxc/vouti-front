

## Fase 4.1 — Planejador (Kanban + Chat)

### Causa raiz / Justificativa

Próxima sub-fase pendente. O Planejador tem layout Kanban custom (colunas + cards de tarefa) e um chat lateral, ambos com visual pré-Apple. É o módulo mais complexo visualmente das sub-fases restantes (depois só sobra CRM).

### Exploração necessária antes de implementar

Vou ler para mapear:
- `src/pages/Planejador.tsx` (ou similar) — header e layout raiz
- `src/components/Planejador/` — Kanban board, colunas, cards, chat
- Identificar arquivos: `KanbanBoard`, `KanbanColumn`, `TaskCard`, `TaskDialog`, `ChatPanel` (ou nomes equivalentes)

### O que vai mudar

**1. Header da página**
- `apple-h1` / `apple-subtitle`.
- Toolbar (filtros, busca, botão "Nova tarefa") com espaçamento mais arejado, botões refinados.

**2. Colunas do Kanban**
- Container da coluna: `rounded-2xl`, `bg-muted/30`, `border-border/40`.
- Header da coluna: tipografia `font-semibold tracking-tight`, contador como pílula sutil (`bg-background/60 rounded-full`).
- Indicador de cor da coluna (já existe via `KANBAN_COLUMNS`) refinado como dot/bar lateral.
- Espaçamento interno mais generoso.

**3. Cards de tarefa**
- `rounded-xl`, `border-border/60`, sombra muito sutil (`shadow-sm`).
- Hover: leve elevação (`hover:shadow-md hover:-translate-y-0.5 transition-all`).
- Tipografia do título: `font-medium tracking-tight`.
- Badges de prioridade/prazo como pílulas (`rounded-full`, cores tintadas).
- Avatar do responsável + ícones de meta (anexos, comentários) mais sutis.
- Indicador visual quando é subtask (já existe lógica `is_subtask`).

**4. Chat lateral (se houver no Planejador)**
- Bolhas de mensagem `rounded-2xl` (cantos arredondados estilo iOS).
- Recebida: `bg-muted`, enviada: `bg-primary/10 text-foreground` (sutil, não chapado).
- Input com `glass-surface` ou borda refinada, `rounded-xl`.
- Header do chat com `glass-surface` se for drawer.

**5. Dialog de criação/edição de tarefa**
- Já herda da Fase 2 (Dialog refinado), validar visual.
- Formulário interno com espaçamento e tipografia consistentes.

**6. Empty states**
- Coluna vazia: texto sutil + ícone (`apple-empty` simplificado).

### Arquivos afetados (estimativa, vou confirmar lendo o diretório)

- `src/pages/Planejador.tsx` (header)
- `src/components/Planejador/KanbanBoard.tsx` (ou similar)
- `src/components/Planejador/KanbanColumn.tsx`
- `src/components/Planejador/TaskCard.tsx`
- `src/components/Planejador/TaskDialog.tsx` (validação)
- `src/components/Planejador/ChatPanel.tsx` ou `ChatDrawer.tsx` (se existir)

### Impacto

- **UX**: Planejador fica visualmente coeso com Dashboard/Controladoria/Financeiro/Agenda. Kanban com aparência de Linear/Notion (cards arredondados, hover sutil). Chat com bolhas estilo iMessage.
- **Dados**: zero mudanças. Lógica de categorização Kanban (memory `planejador-kanban-column-logic`), subtasks-as-cards, drag-and-drop, RLS de arquivos (memory `planejador-files-access`) — **tudo intacto**.
- **Performance**: imperceptível (só CSS).
- **Riscos colaterais**:
  - Kanban tem drag-and-drop — mudanças de padding/border podem afetar cálculo visual do drop zone. Vou preservar dimensões base e mexer só em estética (cores, borders, sombras).
  - Cards reutilizados em outros lugares? Vou verificar antes.
- **Quem é afetado**: todos os usuários do sistema jurídico que usam o Planejador (todas as roles têm acesso, conforme memory `agenda-visibility-logic-non-admin`).

### Validação

1. `/solvenza/planejador` → header + colunas + cards refinados.
2. Drag-and-drop entre colunas → funciona normal, sem glitch visual.
3. Abrir dialog de tarefa → formulário consistente.
4. Chat lateral (se houver) → bolhas e input refinados.
5. Dark mode + viewport 390px (mobile o Kanban vira scroll horizontal — validar).
6. Outros módulos (Dashboard, Agenda, Financeiro) → zero regressão.

### Próximo passo após aprovação

1. Listar `src/components/Planejador/` pra mapear arquivos exatos.
2. Aplicar refinamentos: header → colunas → cards → chat → dialog.
3. Validar visualmente. Depois sigo pra **Fase 4.3 — CRM** (a mais complexa, deixei por último entre os módulos grandes).

