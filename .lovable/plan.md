

## Adicionar coluna "Pausados" + campo "Retornar em" no Planejador

### Causa raiz / Motivação

Hoje o Kanban do Planejador tem 7 colunas (sem prazo, vencido, hoje, esta semana, próxima semana, duas semanas, concluído). Não existe forma de "pausar" uma tarefa para reaparecer numa data futura — o usuário precisa ou apagar o prazo (e perde a referência) ou deixar vencendo.

O usuário quer:
1. Um campo **"Retornar em"** abaixo de "Criado em" no detalhe da tarefa (`PlanejadorTaskDetail.tsx`).
2. Ao definir uma data e confirmar → card vai para uma **nova coluna "Pausados"** (posicionada à esquerda de "Concluído").
3. Quando a data definida chegar → card volta automaticamente para **"Sem prazo"**.

### Correção

#### 1. Banco — nova migration

- Adicionar coluna `pausado_ate timestamptz NULL` em `public.planejador_tasks`.
- Index parcial: `CREATE INDEX idx_planejador_tasks_pausado_ate ON public.planejador_tasks(pausado_ate) WHERE pausado_ate IS NOT NULL;`
- **Sem trigger/cron**: o "retorno automático" será feito de forma reativa pela função `categorizeTask` no front (zero custo, sem job assíncrono). Quando `pausado_ate <= now()`, o card naturalmente reaparece em "Sem prazo".

#### 2. Hook — `src/hooks/usePlanejadorTasks.ts`

- Adicionar `'pausado'` ao tipo `KanbanColumn` e à constante `KANBAN_COLUMNS` (posicionado **antes de `concluido`**, com cor `#a855f7` roxo e label "Pausados").
- Adicionar `pausado_ate?: string | null` à interface `PlanejadorTask`.
- Atualizar `categorizeTask`:
  - Logo no início, se `task.pausado_ate` existir e for **futuro** (> agora) e status ≠ completed → retornar `'pausado'`.
  - Se `pausado_ate` existir mas já passou → ignorar (cai no fluxo normal e vai pra "sem prazo" pois o prazo continua null).
- Adicionar `tasksByColumn.pausado: []` no acumulador.
- Adicionar **auto-refresh leve**: `setInterval` a cada 60s que invalida a query quando há tarefas com `pausado_ate` próximo de expirar, OU mais simples — usar `refetchInterval: 60_000` no `useQuery` quando existe pelo menos uma task pausada (avaliar via `select` callback). Garante que o card "salte" para Sem Prazo sem precisar de F5.

#### 3. Detalhe — `src/components/Planejador/PlanejadorTaskDetail.tsx`

- Abaixo do bloco "Criado em" (linha 429-435), adicionar novo bloco "Retornar em":
  - Ícone: `CalendarClock` (já importado).
  - Label: "Retornar em".
  - Valor: se `task.pausado_ate` existir → mostrar data formatada + botão `X` pequeno para limpar (volta a coluna anterior).
  - Se vazio → botão "Definir data" que abre um `Popover` com `Input type="datetime-local"` + botão "OK".
- Ao clicar OK:
  - Chamar `onUpdate(task.id, { pausado_ate: <ISO>, status: 'pending' })`.
  - Toast: "Tarefa pausada até DD/MM/YYYY HH:mm".
  - Fechar popover.
- Ao limpar (X):
  - `onUpdate(task.id, { pausado_ate: null })`.

#### 4. Kanban — `src/components/Planejador/PlanejadorKanban.tsx`

- Adicionar case `'pausado'` no `switch (destColumn)` do `handleDragEnd`:
  - `updates.pausado_ate = endOfDay(addDays(now, 7)).toISOString();` (default: pausa por 7 dias quando arrastado manualmente).
  - `updates.status = 'pending'`.
- Nos outros cases (vencido, hoje, semana, etc.) e em `concluido` / `sem_prazo`: adicionar `updates.pausado_ate = null` para garantir que sair da coluna Pausados limpa o campo.

#### 5. Settings de colunas — `src/components/Planejador/PlanejadorSettings.tsx`

- Não precisa mudar código (lê de `KANBAN_COLUMNS` automaticamente). A nova coluna aparecerá no painel de configuração já visível e reordenável.
- `getDefaultColumnConfig` em `PlanejadorDrawer.tsx` também herda automaticamente.

#### 6. Migração de configs salvas — `PlanejadorDrawer.tsx`

- Onde carrega `columnConfig` do localStorage/DB: se a config salva existe mas não tem `pausado`, fazer merge com o default para incluir a nova coluna (visível, ordem antes de `concluido`). Evita que usuários antigos não vejam a coluna nova.

### Arquivos afetados

**Modificados:**
- `supabase/migrations/<nova>.sql` — adiciona coluna `pausado_ate` + index.
- `src/integrations/supabase/types.ts` — regenerado automaticamente.
- `src/hooks/usePlanejadorTasks.ts` — tipo, constante, `categorizeTask`, tasksByColumn, refetchInterval condicional.
- `src/components/Planejador/PlanejadorTaskDetail.tsx` — novo bloco "Retornar em" com popover de datetime.
- `src/components/Planejador/PlanejadorKanban.tsx` — case `pausado` no drag-end + limpar `pausado_ate` nos outros cases.
- `src/components/Planejador/PlanejadorDrawer.tsx` — merge de columnConfig para incluir a nova coluna em instalações antigas.

**Sem mudanças:** RLS (herda das policies existentes da tabela), `PlanejadorListView`, `PlanejadorTaskCard`, `PlanejadorPrazosView`, hooks de subtasks/labels/etapas.

### Impacto

**Usuário final (UX):**
- Nova ação "Retornar em" visível no detalhe da tarefa, logo abaixo de "Criado em" — fluxo intuitivo.
- Nova coluna "Pausados" (roxa) aparece à esquerda de "Concluído" no Kanban.
- Tarefas pausadas reaparecem em "Sem prazo" automaticamente quando a data chega (no máximo 60s de atraso por causa do polling).
- Possibilidade extra: arrastar card para "Pausados" pausa por 7 dias por default (pode ser ajustado depois no popover).
- Configuração da coluna pode ser reordenada/renomeada/ocultada via Settings, igual às outras.

**Dados:**
- 1 nova coluna nullable, 1 index parcial — zero impacto em queries existentes.
- Sem trigger/cron — auto-retorno é puramente client-side (categorização reativa). Custo zero no DB.
- Refetch a cada 60s só ativa quando há pelo menos uma tarefa pausada, evitando overhead.

**Riscos colaterais:**
- Se o usuário fechar o navegador, o card "voltará" só quando alguém abrir o Planejador novamente — aceitável pois é puramente visual (o dado em DB já reflete `pausado_ate < now()`).
- Caso futuro precise notificação push ao retornar: exigirá trigger/edge function (fora do escopo).
- Configurações de coluna salvas antigas serão migradas via merge — sem perda de personalização.

**Quem é afetado:**
- Todos os usuários do Planejador (todos os roles que já têm acesso à feature). Multi-tenant: cada tenant herda automaticamente. Nenhum outro módulo afetado.

### Validação

1. Rodar migration → confirmar coluna `pausado_ate` em `planejador_tasks`.
2. Abrir Planejador → confirmar nova coluna "Pausados" (roxa) entre "Sem prazo grupo" e "Concluído".
3. Abrir uma tarefa → confirmar campo "Retornar em" abaixo de "Criado em" → definir data futura → OK → card desaparece da coluna atual e aparece em "Pausados".
4. Definir `pausado_ate` para 2 minutos no futuro → aguardar → card volta sozinho para "Sem prazo" (auto-refresh).
5. Arrastar card para "Pausados" → confirma `pausado_ate = +7d` no DB.
6. Arrastar card de "Pausados" para "Hoje" → confirma `pausado_ate` limpo.
7. Limpar a data no detalhe (botão X) → card volta à categorização normal.
8. Verificar Settings → reordenar/ocultar coluna "Pausados" → comportamento idêntico ao das demais.

