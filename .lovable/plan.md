

# Corrigir exclusão de projetos

## Problema

A política RLS de DELETE na tabela `projects` só permite exclusão para usuários com role `admin`:

```sql
"Admins can delete tenant projects"
USING (has_role(auth.uid(), 'admin') AND tenant_id = get_user_tenant_id())
```

Se o usuário logado não for admin, a exclusão falha silenciosamente (RLS bloqueia).

## Solução

Criar uma política adicional que permite ao **criador do projeto** deletar seus próprios projetos, mantendo o isolamento de tenant:

```sql
CREATE POLICY "Project owners can delete their own projects"
  ON projects FOR DELETE
  USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());
```

Isso permite que qualquer usuário delete projetos que ele mesmo criou, sem precisar ser admin.

## Alternativa

Se a intenção é que **qualquer membro do tenant com acesso ao projeto** possa deletar (não só o criador), a política seria diferente. Mas o padrão mais seguro é: **admin deleta qualquer um** + **criador deleta os seus**.

## Arquivo alterado

- Nova migration SQL (política RLS)

