# Conclusão da Fase 2 — Paginação completa

## Causa raiz
Supabase impõe limite implícito de 1.000 linhas em qualquer `select()` sem `.range()` / `.limit()`. Em tenants grandes (Solvenza, Mercado Galvão), isso faz registros "sumirem" silenciosamente em listagens, dropdowns e batches `IN (...)`.

## Correção
Aplicar `fetchAllPaginated` (listas) e `fetchAllPaginatedIn` (queries `WHERE col IN (ids)`) de `@/lib/supabasePagination` em todos os pontos restantes mapeados na auditoria. Selects que retornam um único registro (`.single()`/`.maybeSingle()`) e os com `.limit()` explícito ficam intocados.

## Arquivos afetados

**Hooks**
- `src/hooks/useVoutiIA.ts` — listagem de `processos_oab` para o assistente.
- `src/hooks/useTaskVinculo.ts` — busca de processos por número/parte.
- `src/hooks/useProtocoloVinculo.ts` — buscas de `processos_oab` e `project_protocolos`.
- `src/hooks/usePrazosAutomaticos.ts` — varredura de `processos_oab` para gerar prazos.
- `src/hooks/usePlanoLimites.ts` — contagem real (já usa `head`, mas a listagem auxiliar não).

**Controladoria**
- `src/components/Controladoria/TarefasTab.tsx` (linhas 229, 380) — `project_processos`.
- `src/components/Controladoria/OABTab.tsx` (linha 120) — `processos_oab` por tenant.
- `src/components/Controladoria/OABManager.tsx` (linha 138) — listagem de processos.
- `src/components/Controladoria/IntimacaoCard.tsx` — `project_processos`.
- `src/components/Controladoria/CentralSubtarefas.tsx` (linha 269) — `processos_oab`.

**Project / Protocolos**
- `src/components/Project/CreateDeadlineDialog.tsx` (linhas 78, 97) — dropdown de `project_protocolos`.
- `src/components/Project/ProjectProtocoloContent.tsx` — apenas selects `.single()`, sem ação.

**Search e dashboards**
- `src/components/Search/ProjectQuickSearch.tsx` (linhas 60, 115) — busca global de `project_protocolos`.
- `src/components/Dashboard/Metrics/AdminMetrics.tsx` (linha 42) — `project_protocolos`.
- `src/components/Dashboard/PrazosDistributionChart.tsx` — agregações de prazos.

**Super Admin / Comunicação**
- `src/components/SuperAdmin/SuperAdminWebhookTest.tsx` (linha 42) — `processos_oab`.
- `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx` (linhas 39, 172).
- `src/components/Communication/NotificationCenter.tsx` (linhas 152, 210).

**Pages**
- `src/pages/ProjectView.tsx` (linha 126) — `project_protocolos` por projeto.
- `src/pages/Financial.tsx` — listagens financeiras.

Para cada `WHERE id IN (ids)` onde `ids` pode passar de 500, troca por `fetchAllPaginatedIn` (chunk de 500). Para listagens sem filtro restritivo, troca por `fetchAllPaginated` com `.order(...)` estável (o helper exige range determinístico).

## Impacto

1. **Usuário final (UX/telas/fluxos)**
   - Tarefas, intimações e processos da Controladoria voltam a listar tudo em tenants com >1.000 registros.
   - Busca global (`ProjectQuickSearch`) deixa de cortar resultados em projetos grandes.
   - Dropdowns de "Novo Prazo" e `CreateDeadlineDialog` mostram todos os protocolos do projeto.
   - VoutiIA passa a "ver" 100% da base de processos do tenant ao responder.
   - Notificações e cards no NotificationCenter param de pular registros antigos.
   - Dashboards de admin (AdminMetrics, PrazosDistributionChart) refletem totais reais.

2. **Dados (migrations/RLS/performance)**
   - **Sem migrations**, sem mudança de RLS — apenas leitura.
   - **Performance**: para tenants pequenos (<1.000 linhas) é exatamente 1 request, custo zero. Para grandes, vira N requests sequenciais (1 por página de 1.000); aceitável e o helper tem `hardCap=50` (até 50k linhas por listagem).
   - Ordenações estáveis adicionadas onde faltam, para garantir paginação correta.

3. **Riscos colaterais**
   - Listas muito grandes podem aumentar latência inicial da tela (ex.: VoutiIA, busca global). Mitigável por debouncing/limit explícito quando o objetivo for "top N" — caso surja, adotamos `.limit()` no lugar.
   - Ordenação adicionada pode mudar levemente a ordem visual em telas que dependiam da ordem default do Postgres.
   - `SuperAdminProcessosSemAndamentos` sobre toda a base ficará mais lento; mantém escopo de admin.

4. **Quem é afetado**
   - **Todos os tenants** se beneficiam, mas o ganho prático é visível em tenants grandes (Solvenza, Mercado Galvão, escritórios com OABs com muitos processos).
   - **Admins/Controllers**: dashboards, super-admin e controladoria voltam a bater com a realidade.
   - **Advogados/Estagiários**: tarefas, intimações e dropdowns de prazos completos.
   - **Super-admin**: telas de diagnóstico passam a varrer 100% dos processos monitorados.

## Validação
- Build TS limpo após cada lote de edição.
- Conferir no `/solvenza/dashboard` e `/mercadogalvao/...` se as telas listadas voltam a popular itens previamente "ocultos".
- Smoke test manual:
  - Abrir Controladoria → Tarefas e OAB Tab num tenant grande e contar registros vs `count(*)` no SQL editor.
  - Abrir `CreateDeadlineDialog` num projeto com >1.000 protocolos e validar que todos aparecem.
  - Rodar busca global em projeto com >1.000 protocolos.
  - Conferir NotificationCenter para advogado que recebia notificações antigas.
- Linter Supabase para garantir que nenhuma policy/trigger foi tocada inadvertidamente.

## Fora do escopo (Fase 4 — próxima)
- UI no Super-Admin para `project_carteira_processos_audit` (timeline de movimentações).
- Regra ESLint custom proibindo `.from(...).select(...)` de listagem sem `.limit()`/`.range()`/`fetchAllPaginated*`.
- Documentação do padrão.
