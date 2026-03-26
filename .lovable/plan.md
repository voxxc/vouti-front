

# Corrigir exclusão de projetos — problema definitivo

## Causa raiz identificada

Ao deletar um projeto, o PostgreSQL tenta fazer CASCADE DELETE nas tabelas filhas. Porém, **4 tabelas** têm RLS habilitado mas **nenhuma política de DELETE**, o que bloqueia o cascade silenciosamente:

- `project_columns` — colunas do kanban
- `project_carteiras` — carteiras de protocolos
- `client_history` — histórico de ações
- `task_history` — histórico de tarefas (FK é SET NULL, não CASCADE, mas pode causar problemas futuros)

Quando o cascade tenta apagar linhas nessas tabelas, o RLS nega a operação por falta de política, resultando em erro.

## Solução

Criar uma **migration SQL** que adiciona políticas de DELETE nessas tabelas, permitindo que membros do tenant (ou do projeto) possam deletar os registros filhos.

### Migration SQL

```sql
-- project_columns: permitir delete por membros do projeto
CREATE POLICY "Members can delete project columns"
  ON public.project_columns FOR DELETE
  USING (is_project_member(project_id));

-- project_carteiras: permitir delete por membros do tenant
CREATE POLICY "Tenant members can delete project carteiras"
  ON public.project_carteiras FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- client_history: permitir delete por membros do tenant
CREATE POLICY "Tenant members can delete client history"
  ON public.client_history FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- task_history: permitir delete por membros do tenant (SET NULL mas seguro ter)
CREATE POLICY "Tenant members can delete task history"
  ON public.task_history FOR DELETE
  USING (tenant_id = get_user_tenant_id());
```

## Alterações no código

Nenhuma alteração no código frontend é necessária. O `deleteProject` em `useProjectsOptimized.ts` já faz `supabase.from('projects').delete().eq('id', projectId)` corretamente. O problema é exclusivamente no banco de dados.

## Resumo

- **1 migration SQL** com 4 políticas de DELETE
- **0 arquivos de código** alterados
- Após a migration, a exclusão de projetos funcionará definitivamente

