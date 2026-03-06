

## Diagnóstico: Abas (Workspaces) dos Projetos Sumiram

### Causa raiz identificada
As políticas de RLS da tabela `project_workspaces` usam a função `is_project_member(project_id)`, que verifica **apenas** se o usuário é o criador do projeto (`created_by`) ou um colaborador (`project_collaborators`).

Porém, a tabela `projects` tem políticas separadas para **admins** e **controllers** que permitem ver todos os projetos do tenant — sem precisar ser membro. Resultado:

- **Admin/Controller vê o projeto** (policy de admin na tabela `projects`)
- **Admin/Controller NÃO vê as abas** (policy de `project_workspaces` exige `is_project_member`, que retorna `false`)
- **Criar nova aba falha silenciosamente** (INSERT policy também exige `is_project_member`)

Isso explica por que as abas "sumiram" — o usuário consegue abrir o projeto mas as workspaces não são retornadas pelo banco.

### Solução
Atualizar as 4 políticas RLS de `project_workspaces` para incluir verificação de admin/controller, usando o mesmo padrão da tabela `projects`.

### Alterações

**Banco de dados (SQL via Edge Function ou migration)**

Recriar as 4 políticas de `project_workspaces` com a lógica:
```
(tenant_id = get_user_tenant_id()) AND (
  is_project_member(project_id) 
  OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  OR has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
)
```

Isso será feito via `supabase.rpc` ou diretamente via SQL migration, aplicando DROP + CREATE para cada uma das 4 policies (SELECT, INSERT, UPDATE, DELETE).

### Arquivos
| Local | Mudança |
|-------|---------|
| Supabase (SQL) | Recriar 4 RLS policies em `project_workspaces` adicionando verificação de admin/controller |

