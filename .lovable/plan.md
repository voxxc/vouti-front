## Causa raiz

O Supabase aplica um **limite implícito de 1.000 linhas por query** quando não há `.limit()` ou `.range()`. Vários pontos do código fazem `select(...)` para "tudo do tenant" sem paginação, então quando uma tabela ultrapassa 1.000 linhas em um tenant, os registros excedentes **somem silenciosamente** das telas, métricas e relatórios — exatamente o que aconteceu com o prazo do Alan.

Após varredura completa do `src/` e `supabase/functions/`, identifiquei **490 SELECTs de listagem sem paginação**. A maioria é segura hoje porque os dados ainda são pequenos. Porém:

- **Tabelas já grandes** (risco real ou iminente):
  - `processos_oab_andamentos` — 41.814 linhas (global)
  - `whatsapp_messages` — 20.697 linhas
  - `project_protocolo_etapas` — 1.668 linhas
  - `deadlines` — 1.025 linhas (1.013 só na SOLVENZA — já estourava)
  - `processos_oab` — 734 linhas (perto do limite por tenant)
  - `project_protocolos` — 658 linhas

- **Sintomas confirmados ou iminentes**:
  - Prazos sumindo da Agenda (corrigido na rodada anterior).
  - Indicadores de Controladoria mostrando números abaixo do real.
  - Métricas de Dashboard de prazos truncadas.
  - "Prazos Concluídos" da Central paralisando em 1.000.
  - Inbox/Kanban do WhatsApp listando só as 1.000 mensagens mais recentes em tenants ativos.

## Correção

A correção será feita em **3 camadas**, do mais crítico para o periférico:

### Camada 1 — Helper compartilhado de paginação
Criar `src/lib/supabasePagination.ts` exportando:
- `fetchAllPaginated(builderFactory, pageSize=1000, hardCap=20)` — repete `.range()` até esgotar.
- Padrão único para todos os pontos que precisam de "todos os registros visíveis".

### Camada 2 — Telas e métricas que JÁ truncam (Tier 1)
Trocar SELECT-all por paginação ou contagem agregada. Onde só precisamos de número, usar `count: 'exact', head: true` para não baixar linhas.

| Arquivo | O que ajustar |
|---|---|
| `src/hooks/useProcessosMetrics.ts` | Contar `processos_oab_andamentos` por `count: exact, head: true`; paginar `deadlines` por tenant. |
| `src/components/Controladoria/ControladoriaIndicadores.tsx` | Paginar `deadlines` e `processos_oab` por tenant. |
| `src/components/Controladoria/CentralPrazosConcluidos.tsx` | Paginar prazos concluídos. |
| `src/components/Dashboard/PrazosDistributionChart.tsx` | Paginar `deadlines`. |

### Camada 3 — Listagens que vão truncar logo (Tier 2)
Aplicar paginação ou `.limit()` explícito (com justificativa de UX, ex.: últimos 30 dias / últimos 200 itens).

| Arquivo | O que ajustar |
|---|---|
| `src/components/CRM/WhatsAppBot.tsx` (linhas 651, 1112) | Limitar mensagens recentes (ex.: últimas 500) ou paginar conforme uso. |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx` | Paginar mensagens não atribuídas. |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx`, `WhatsAppKanban.tsx`, `WhatsAppLabelConversations.tsx` | Aplicar `.limit()` em ordens desc + carregar agrupado por contato. |
| `src/components/Controladoria/OABTab.tsx`, `OABManager.tsx` | Paginar `processos_oab` por tenant. |
| `src/components/Project/ProjectProcessos.tsx` | Paginar lista de processos. |
| `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` e funções edge `judit-*` | Paginar `processos_oab`/`processos_oab_andamentos` quando aplicável. |

### Camada 4 — Listagens médias, crescimento previsto (Tier 3)
Paginar para evitar regressão futura silenciosa, sem mudança visível na UX:

| Arquivo |
|---|
| `src/components/Financial/FinancialContent.tsx`, `FinancialMetrics.tsx`, `src/pages/Financial.tsx`, `src/hooks/useRelatorioFinanceiro.ts` (clientes, parcelas, custos, colaborador_vales, colaborador_pagamentos) |
| `src/hooks/useClientes.ts`, `useClienteAnalytics.ts`, `useAniversarios.ts` |
| `src/hooks/useColaboradores.ts` |
| `src/hooks/useReunioes.ts`, `useReuniaoMetrics.ts`, `useRelatorioReunioes.ts`, `useReuniaoClientes.ts` |
| `src/hooks/useTasksMetrics.ts`, `useClienteTasksMetrics.ts`, `src/components/Dashboard/OverviewSection.tsx`, `src/components/Search/GlobalSearch.tsx` |
| `src/hooks/usePlanejadorTasks.ts` |
| `src/components/Agenda/AgendaContent.tsx` (carga de `project_protocolos` por tenant em fluxo de criação) |

### Camada 5 — Memória do projeto
Adicionar regra `mem://architecture/supabase-1000-row-limit` no índice: **toda listagem deve usar `fetchAllPaginated`, `.range()` ou `.limit()` explícito; nunca confiar no retorno padrão**. Isso evita que a próxima feature reintroduza o bug.

## Arquivos afetados (resumo)

- Novo: `src/lib/supabasePagination.ts`
- Edits Tier 1 (4 arquivos)
- Edits Tier 2 (7–9 arquivos React + 4 edge functions)
- Edits Tier 3 (~14 hooks/páginas)
- Atualização de `mem://index.md` + nova memória

Total estimado: ~30 arquivos ajustados, sem schema/migration nem mudança de RLS.

## Impacto

1. **Usuário final / UX**
   - Prazos, processos, mensagens, indicadores e relatórios voltam a mostrar **todos** os dados visíveis pela RLS, não só os 1.000 primeiros.
   - Onde fizer sentido (WhatsApp Inbox/Kanban), a janela visível terá um limite explícito (ex.: últimos 500 itens) com possibilidade futura de "carregar mais".
   - Telas continuam com o mesmo layout — a mudança é silenciosa e corretiva.

2. **Dados / migrations / RLS / performance**
   - Sem migration, sem alteração de RLS, sem alteração de schema.
   - Nenhum dado é mutado.
   - Performance: queries de tenants pequenos não mudam (1 lote = 1 chamada). Tenants grandes farão 2–3 chamadas em vez de truncar — mais correto e previsível.
   - Métricas que apenas contam linhas migram para `count: exact, head: true`, o que é **mais rápido** que baixar 1.000 linhas e contar no JS.

3. **Riscos colaterais**
   - Em telas com tabelas muito grandes, a primeira carga pode levar alguns segundos a mais em tenants enormes — mitigado por limites explícitos onde cabe.
   - Algumas listagens do WhatsApp deixarão de rolar infinitamente: passarão a mostrar "últimas N" com possibilidade de evoluir para paginação real depois.
   - Edge functions que iteram processos via Judit ficarão um pouco mais lentas em tenants enormes; já são jobs de background.

4. **Quem é afetado**
   - **Todos os tenants e papéis**, com benefício mais visível para tenants grandes (SOLVENZA hoje, outros no futuro).
   - **Admin/controller** ganham indicadores corretos.
   - **Advogado/perito/financeiro** veem todos os seus prazos, processos, parcelas e relatórios.
   - **CRM/WhatsApp** ganha consistência ao listar conversas em volumes altos.
   - **Super admin** passa a ver totais reais.

## Validação

- Conferir no banco que cada tabela com `> 1000` linhas em algum tenant retorna a contagem correta na tela após a paginação (deadlines, processos_oab_andamentos, processos_oab).
- Re-testar o caso original do Alan (`16b84fd9-...`) já corrigido.
- Validar Indicadores da Controladoria contra `count(*)` direto no banco para SOLVENZA.
- Validar Dashboard de prazos e Central de Concluídos contra contagem direta.
- Validar Inbox/Kanban do WhatsApp em tenant com >1000 mensagens (SOLVENZA).
- Verificar que nenhum filtro `tenant_id`/RLS foi alterado (mesma visibilidade entre tenants).
- Adicionar a regra de paginação em `mem://` para que a IA aplique automaticamente em novas features.