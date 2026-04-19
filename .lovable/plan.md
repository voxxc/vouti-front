

## Ajustes no Dashboard Admin

### Causa raiz

1. KPI "Total de Projetos" mostra 86 (count de `projects`), mas o usuário quer ver clientes cadastrados — a métrica correta vem da tabela `clientes` (47 hoje no Solvenza).
2. O painel "Minhas Tarefas e Prazos" (`PrazosAbertosPanel`) hoje aparece **abaixo** dos 4 KPIs. O usuário quer invertido: painel de tarefas/prazos no topo, KPIs abaixo.

### Correção

**1. Trocar KPI "Total de Projetos" → "Total de Clientes"** (`AdminMetrics.tsx`)
- Na query do React Query, substituir `projects.count` por `clientes.count` filtrado por `tenant_id` (RLS já restringe ao tenant atual via `get_user_tenant_id`).
- Renomear a chave de `totalProjects` para `totalClientes`.
- Atualizar o card: label "Total de Clientes", subtítulo "Cadastrados", manter ícone `FolderKanban` ou trocar por `Users` (mantenho `Users` para coerência semântica e movo `Users` do card "Casos" para outro ícone — proponho `Briefcase` em "Casos").

**2. Reordenar layout** (`AdminMetrics.tsx`)
- Mover `<PrazosAbertosPanel />` + `<DeadlineDetailDialog />` para **antes** do grid de KPIs.
- Sequência final:
  1. Header (saudação + toggle privacidade)
  2. **PrazosAbertosPanel** (Minhas Tarefas e Prazos)
  3. Grid de KPIs (4 cards: Clientes, Casos, Processos, Prazos)
  4. ClienteAnalytics, ProcessosMetrics, TasksMetrics, etc. (mantém)

### Arquivos afetados

- `src/components/Dashboard/Metrics/AdminMetrics.tsx` (única mudança)

### Impacto

- **UX**: 
  - Admin vê primeiro o que importa pro dia (tarefas/prazos pessoais), depois métricas globais — fluxo mais acionável.
  - KPI "Clientes" reflete a base real cadastrada (47), não a soma técnica de projects (86 — inclui possíveis duplicações/legados).
- **Dados**: zero migration. Apenas troca de query de leitura. RLS de `clientes` já restringe ao tenant.
- **Performance**: imperceptível (mesma quantidade de queries paralelas).
- **Riscos colaterais**: 
  - O número vai cair visualmente de 86 → 47 no KPI principal — confirmar com usuário se isso bate com a expectativa dele de "clientes ativos" (pode haver diferença entre clientes ativos vs. arquivados — vou contar todos por padrão, alinhado com o card atual).
  - Outras roles (`AdvogadoMetrics`, etc.) **não são afetadas** — só o painel admin.
- **Quem é afetado**: apenas admins do tenant ao acessar `/:tenant/dashboard`.

### Validação

1. `/solvenza/dashboard` (admin) → painel "Minhas Tarefas e Prazos" no topo.
2. KPI "Total de Clientes" mostra 47 (Solvenza).
3. Demais cards (Casos, Processos, Prazos) intactos.
4. Outras roles (advogado, financeiro, etc.) sem alteração.
5. Dark mode + 390px → layout responsivo ok.

