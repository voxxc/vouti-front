
## Fase 2 — Paginação aplicada (continuação)

- `src/lib/supabasePagination.ts`: novo helper `fetchAllPaginatedIn` para `WHERE col IN (...ids)` em chunks de 500.
- `src/hooks/useAndamentosNaoLidosGlobal.ts`: lista global de processos do tenant agora paginada.
- `src/hooks/useOABs.ts` (`fetchProcessos` por OAB): paginado.
- `src/components/Project/ProjectProtocolosList.tsx`: carteiras + `project_carteira_protocolos` paginados (resolve carteiras vazias quando há >1000 vínculos).
- `src/components/Agenda/AgendaContent.tsx`: 
  - batch `processos_oab` / `project_protocolos` por IN-list agora chunked;
  - selects de `projects` e `project_protocolos` no diálogo "Novo Prazo" paginados.

### Impacto
- **UX**: dropdowns e listas de protocolos/processos passam a mostrar todos os registros mesmo em tenants grandes (>1000 itens). Carteiras dentro de workspaces (ex.: Aureliano em Mercado Galvão) voltam a listar todos os vínculos.
- **Dados**: nenhuma mutação, apenas leitura. Ligeiro aumento no número de requests para tenants pequenos é negligível (1 página única).
- **Riscos**: para tenants enormes (>50k linhas em uma listagem) o `hardCap` padrão de 50 páginas é suficiente; revisar caso futuro tenant ultrapasse.
- **Afetados**: todos os tenants — visivelmente os de grande volume (Solvenza, Mercado Galvão).
## Causa raiz

A revisão do banco mostrou três classes distintas de "sumiço" silencioso desde a correção das mil linhas:

**1) Carteiras vazias dentro de workspaces (Mercado Galvão / Aureliano e outros)**
- No tenant inteiro: 216 carteiras cadastradas, apenas **6 vínculos** em `project_carteira_processos`. No projeto Mercado Galvão (55 carteiras): **0 vínculos**. Não é problema de paginação — os vínculos foram efetivamente apagados.
- Causa: as duas FKs de `project_carteira_processos` (`carteira_id` e `project_processo_id`) estão com `ON DELETE CASCADE` (`confdeltype='c'`). Toda vez que um processo é desvinculado/recriado em `project_processos` (por troca de workspace, reordenação destrutiva, sync, etc.), o vínculo da carteira é apagado em silêncio. Não existe nenhuma trilha de auditoria.
- A UI de `ProjectProcessos.handleDesvincularProcesso` faz `DELETE` direto em `project_processos` — qualquer fluxo que use isso some com a categorização da carteira.

**2) Listagens ainda vulneráveis ao limite implícito de 1000 linhas**
Mesmo após o hotfix, várias queries críticas ainda fazem `select('*').eq(...)` sem `.range`/`.limit`/`fetchAllPaginated`. Risco de sumiço silencioso conforme a tabela cresce:
- `src/components/Project/ProjectProcessos.tsx` — `loadCarteiras` (`project_carteira_processos.in('carteira_id', […])`) e a query principal de `project_processos` (sem paginar).
- `src/hooks/useProjectProtocolos.ts` — listagem de protocolos do projeto.
- `src/hooks/useProjectsOptimized.ts` — `tasks` e `project_columns` por tenant.
- `src/pages/ProjectView.tsx` e `src/pages/SectorView.tsx` — carregam `tasks` e `project_columns` do projeto sem paginar (projetos grandes podem ter > 1000 tarefas/colunas).
- `src/pages/ProjectViewWrapper.tsx` / `AcordosView.tsx` — `tasks` por projeto.
- `src/components/Agenda/AgendaContent.tsx` — vários `from('deadlines')` e `from('project_protocolos')` de leitura ampla.
- `src/components/Controladoria/TarefasTab.tsx`, `CentralSubtarefas.tsx`, `IntimacaoCard.tsx` — leituras agregadas em `deadlines`/`project_processos`.
- `src/components/Search/GlobalSearch.tsx` e `ProjectQuickSearch.tsx` — busca em `tasks`, `deadlines`, `project_protocolos`.
- `src/hooks/useTOTPData.ts` (carteiras TOTP) e demais consumidores em `Dashboard/TOTP/*`.
- `src/components/Project/TaskTarefasTab.tsx`, `ProjectProtocoloContent.tsx` — `deadlines` por projeto.

**3) Dados órfãos que ficaram "invisíveis"**
- `project_processos` com `workspace_id IS NULL` aparecem só no workspace padrão (regra atual em `loadProcessosVinculados`). Em projetos com vários workspaces criados depois, processos antigos podem estar desaparecendo do workspace correto.

---

## Correção

### Fase 1 — Recuperar e blindar carteiras (causa raiz #1)

1. Migração:
   - Trocar `ON DELETE CASCADE` por `ON DELETE RESTRICT` em `project_carteira_processos.project_processo_id` (impede sumiço silencioso quando alguém deleta processo vinculado a carteira).
   - Criar tabela `project_carteira_processos_audit` (histórico de inserts/deletes com `actor`, `motivo`, `snapshot`).
   - Trigger `BEFORE DELETE` em `project_processos` que copia os vínculos de carteira para a tabela de auditoria antes de qualquer remoção (mesmo se a FK voltar a ser cascade no futuro).
2. Tentativa de recuperação: varrer `processo_historico` / `tenant_banco_ids` / logs antigos buscando vínculos passados; popular o que conseguirmos. Caso não exista trilha utilizável, documentar no Super-Admin que o histórico anterior é irrecuperável e oferecer botão "reclassificar carteiras" no `ProjectProcessos`.
3. Refatorar `handleMoverParaCarteira`:
   - Usar 1 transação (RPC) que faz delete + insert atomicamente.
   - Validar que `project_processo_id` pertence ao mesmo `workspace_id` da carteira; bloquear no servidor.

### Fase 2 — Eliminar limite de 1000 linhas em todas as listagens "completas"

Substituir por `fetchAllPaginated` (ou `.limit()` explícito quando for janela proposital) em:
- `ProjectProcessos.tsx` (carteiras + processos vinculados)
- `useProjectProtocolos.ts`
- `useProjectsOptimized.ts`
- `ProjectView.tsx`, `SectorView.tsx`, `ProjectViewWrapper.tsx`, `AcordosView.tsx`, `AcordosViewWrapper.tsx`, `ProjectDrawerContent.tsx`
- `AgendaContent.tsx`, `useAgendaData.ts`, `useTasksMetrics.ts`, `useClienteTasksMetrics.ts`
- `Controladoria/{TarefasTab,CentralSubtarefas,CentralPrazosConcluidos,IntimacaoCard,ControladoriaIndicadores,PrazosCasoTab}.tsx`
- `Communication/NotificationCenter.tsx`
- `Dashboard/{PrazosAbertosPanel,Metrics/AdminMetrics,PrazosDistributionChart}.tsx`
- `Search/{GlobalSearch,ProjectQuickSearch}.tsx`
- `useTOTPData.ts` e `Dashboard/TOTP/*`
- `Project/{TaskTarefasTab,ProjectProtocoloContent,ProjectProtocolosList,CreateDeadlineDialog,EtapaModal}.tsx`

Para cada arquivo: revisar se a intenção é "todos os registros visíveis" (→ `fetchAllPaginated`) ou "uma janela" (→ `.limit(N)` justificado). Adicionar comentário curto explicando.

### Fase 3 — Reatachar órfãos de workspace (causa raiz #3)

1. Migração de manutenção: para cada projeto, atualizar `project_processos.workspace_id IS NULL` para o `workspace_id` default do projeto. Mesmo tratamento para `project_protocolos.workspace_id IS NULL`.
2. Adicionar `NOT NULL` nas colunas `workspace_id` dessas duas tabelas (com default = workspace padrão do projeto via trigger `BEFORE INSERT`) para evitar reaparecer.
3. Remover o ramo `or(workspace_id.eq.X,workspace_id.is.null)` em `loadProcessosVinculados` — passa a ser sempre `eq(workspace_id, X)`.

### Fase 4 — Guard-rail permanente

- Lint custom (regra ESLint simples no diretório `src/`) que avisa quando vê `.from('<tabela_de_risco>').select(...)` sem `.limit(`, `.range(` ou `fetchAllPaginated`. Lista de tabelas de risco vinda da memória `mem://architecture/supabase-1000-row-limit`.
- Atualizar a memória com a nova lista expandida de tabelas de risco descoberta nesta auditoria.

---

## Arquivos afetados

- Migrações novas: `project_carteira_processos` (FK + auditoria + trigger), backfill de `workspace_id`, NOT NULL + trigger default.
- ~25 arquivos `.ts/.tsx` listados acima (substituição por `fetchAllPaginated`).
- `src/components/Project/ProjectProcessos.tsx`: refator de `handleMoverParaCarteira` para RPC atômica + remover ramo de órfãos.
- `src/components/SuperAdmin/`: novo card "Auditoria de carteiras" mostrando histórico de vínculos (reaproveita layout dos botões de IDs).
- `mem://architecture/supabase-1000-row-limit`: atualização.
- `eslint.config.js`: nova regra custom (opcional).

## Impacto

**Para o usuário final (UX, telas, fluxos)**
- Carteiras param de "esvaziar sozinhas". Quando alguém tentar excluir um processo que está em carteira, recebe aviso claro ("remova da carteira primeiro" ou "isso vai apagar X classificações").
- Aba do workspace passa a mostrar 100% dos processos/protocolos/tarefas mesmo em projetos com mais de 1000 itens — fim do sumiço silencioso (igual ao que aconteceu com prazos da Agenda).
- Super-Admin ganha visibilidade do histórico de vínculos de carteira (quando, quem, qual motivo).
- Processos órfãos de workspace voltam a aparecer no workspace padrão do projeto correto.

**Para os dados (migrations, RLS, performance)**
- Backfill: `UPDATE` em `project_processos`/`project_protocolos` com `workspace_id IS NULL` (provavelmente algumas centenas de linhas).
- Nova tabela `project_carteira_processos_audit` (cresce devagar, append-only).
- Mudança de FK de CASCADE → RESTRICT: tentativas antigas de DELETE em `project_processos` passam a falhar se houver vínculo de carteira; precisamos garantir que toda UI que apaga processo trate o erro.
- RLS: reuso de `tenant_id` + `has_role_in_tenant` nos novos objetos.
- Performance: `fetchAllPaginated` faz N requests (N = páginas de 1000). Para projetos pequenos é equivalente. Para tenants grandes, somar `count(*) head:true` antes para evitar buscar 50k linhas onde não é preciso.

**Riscos colaterais**
- Trocar CASCADE por RESTRICT pode quebrar fluxos que apagavam processo legitimamente (ex.: limpeza de duplicados). Mitigado adicionando RPC "delete_processo_with_carteira_cleanup" que move vínculos para auditoria antes do delete.
- Tornar `workspace_id NOT NULL` exige garantir que TODA inserção (UI + edge functions de sync Judit) passe `workspace_id`. Trigger de default minimiza, mas precisa ser testado com `judit-resetar-processo`, `judit-ativar-monitoramento` e n8n.
- `fetchAllPaginated` mal usado em listagens de UI muito grandes pode aumentar latência inicial — manter `.limit()` explícito onde a UI mostra só "últimos N".

**Quem é afetado**
- Todos os tenants com projetos multi-workspace (principalmente Solvenza/Mercado Galvão).
- Admin / controller (ganham auditoria de carteiras no Super-Admin).
- Advogados/estagiários (param de perder classificação manual de processos).
- Edge functions Judit + n8n (precisam continuar setando `workspace_id` corretamente após o NOT NULL).

## Validação

1. Rodar query de sanidade antes/depois: contagem de carteiras × contagem de vínculos por tenant.
2. Caso de teste manual: criar carteira no workspace Aureliano, arrastar processo, trocar de workspace, voltar — vínculo preservado.
3. Caso de teste manual: tentar excluir processo vinculado a carteira → mensagem clara, vínculo registrado em auditoria se confirmado.
4. Projeto com > 1000 itens (simular ou usar maior tenant atual) — verificar que ProjectView lista todas as tarefas.
5. `judit-resetar-processo` em processo monitorado → continuar com workspace_id correto, sem virar órfão.
6. Check no Super-Admin: card de auditoria de carteiras mostra o histórico do teste.

Posso começar pela Fase 1 (carteiras) ou prefere que eu rode as 4 fases em sequência?