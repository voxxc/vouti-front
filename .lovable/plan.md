## Causa raiz
O processo `5000992-55.2024.8.13.0240` já está vinculado ao projeto **MERCADO E AÇOUGUE GALVÃO** em um workspace. A tabela `project_processos` tem **dois índices únicos conflitantes**:

- `project_processos_unique_per_ws` → `(projeto_id, workspace_id, processo_oab_id)` ✅ regra correta
- `project_processos_projeto_id_processo_oab_id_key` → `(projeto_id, processo_oab_id)` ❌ legado

Ao entrar em outro workspace do projeto, o processo aparece como "disponível" (o filtro só olha os vínculos do workspace atual), mas o INSERT quebra em `duplicate key ... project_processos_projeto_id_processo_oab_id_key`. Resultado: o vínculo não acontece e o toast mostra erro genérico.

## Correção
1. Migration: `DROP INDEX IF EXISTS public.project_processos_projeto_id_processo_oab_id_key` (mantendo o `project_processos_unique_per_ws`).
2. `src/components/Project/ProjectProcessos.tsx` — em `handleVincularProcesso`, detectar `error.code === '23505'` e exibir toast "Este processo já está vinculado a este workspace" no lugar da mensagem crua do Postgres.

## Arquivos afetados
- Nova migration (drop do índice legado)
- `src/components/Project/ProjectProcessos.tsx`

## Impacto
1. **Usuário final**: passa a conseguir vincular o mesmo processo em workspaces diferentes do mesmo projeto — comportamento que a UI já permitia tentar. Mensagem de erro fica clara em caso de duplicidade real no mesmo workspace.
2. **Dados**: apenas um índice é removido; nenhum registro é alterado. `project_processos_unique_per_ws` continua bloqueando duplicatas dentro do mesmo workspace.
3. **Riscos colaterais**: baixos. Todo o carregamento em `ProjectProcessos.tsx` já filtra por `workspace_id`; nenhum código depende da unicidade global antiga.
4. **Quem é afetado**: todos os tenants que usam múltiplos workspaces por projeto (Solvenza inclusive). Nenhuma funcionalidade é removida.

## Validação
- No projeto MERCADO E AÇOUGUE GALVÃO, alternar para outro workspace e vincular o CNJ `5000992-55.2024.8.13.0240` — deve concluir sem erro.
- Vincular o mesmo CNJ duas vezes no mesmo workspace — deve mostrar toast "já vinculado".
- Verificar em `pg_indexes` que só resta o índice único `project_processos_unique_per_ws` para o par de colunas.
