
Objetivo: fazer os prazos concluídos pelo Wesley voltarem a aparecer em **Agenda > Concluídos** de forma estável (sem sumir após reload).

1) Diagnóstico confirmado
- Os dois prazos da Diuza estão com `completed = true` e `concluido_por = Wesley`.
- Mesmo assim, eles não chegam/entram na lista por dois bloqueios:
  - **RLS de `deadlines` (SELECT)** hoje só permite ver quando usuário é `user_id`, `advogado_responsavel_id` ou tagged.
  - **Filtro de usuário no frontend (`AgendaContent`)** pré-filtra por responsável/tagged antes de montar “Concluídos”, descartando casos de `createdBy`/`completedBy`.

2) Implementação proposta (correção completa)
- **Banco (migration SQL)**
  - Ajustar policy `Users can view deadlines in tenant` para incluir:
    - `concluido_por = auth.uid()`
  - Manter `tenant_id = get_user_tenant_id()` intacto (sem quebrar isolamento multi-tenant).

- **Frontend (`src/components/Agenda/AgendaContent.tsx`)**
  - Separar filtros:
    - `searchFilteredDeadlines` (apenas busca por texto)
    - `filteredDeadlines` (busca + filtro de usuário para seções não concluídas)
  - Em `getCompletedDeadlines`, usar base de `searchFilteredDeadlines` e aplicar visibilidade por participação:
    - responsável **ou** tagged **ou** criador (`createdByUserId`) **ou** concluidor (`completedByUserId`).
  - Quando houver filtro por usuário selecionado, aplicar o mesmo critério expandido também para concluídos (não só responsável/tagged).

- **Backfill de consistência**
  - Atualizar registros concluídos com `concluido_por` preenchido e `concluido_em` nulo (incluindo os 2 da Diuza), para manter consistência com outras telas/relatórios.

3) Detalhes técnicos
```text
Fluxo após ajuste:
deadlines (RLS inclui concluido_por)
   -> AgendaContent fetch
      -> searchFilteredDeadlines
         -> getCompletedDeadlines(completed + critério expandido)
```

Critério expandido de participação em Concluídos:
- advogado_responsavel_id == usuário
- taggedUsers contém usuário
- user_id == usuário
- concluido_por == usuário

4) Validação (E2E)
- Logar como Wesley.
- Abrir Agenda > Concluídos.
- Confirmar que:
  - “APRESENTAR EMBARGOS À EXECUÇÃO” aparece.
  - “EMBARGOS À MONITÓRIA” aparece.
- Trocar filtro “Visualizando prazos de” entre “Wesley” e “Todos os usuários” e confirmar que os dois continuam visíveis em Concluídos.
- Recarregar a página e validar persistência.
