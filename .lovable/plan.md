

## Diagnóstico — 3 problemas encontrados

### 1. Conclusão não persiste (UPDATE bloqueado por RLS)
O prazo "CONFECÇÃO DE LAUDO PARA EMBARGOS À MONITÓRIA" está com `completed = false` no banco. Wesley é o `advogado_responsavel_id`, mas a policy de UPDATE exige `auth.uid() = user_id` (criador). Como Wesley não criou o prazo, o UPDATE é silenciosamente bloqueado pelo RLS — a conclusão e o comentário não foram salvos.

### 2. "Projeto não encontrado" nos concluídos do Wesley
A query de deadlines faz join com `projects (name, client)`. A RLS de projects exige `is_project_member(id)` — Wesley não é membro/colaborador de vários projetos, então o join retorna NULL e aparece "Projeto não encontrado".

### 3. Comentário sumido
Consequência direta do problema 1 — como o UPDATE foi bloqueado, o `comentario_conclusao` não foi gravado.

---

## Correções

### A. RLS: Expandir UPDATE policy de deadlines
Permitir que `advogado_responsavel_id` e usuários tagged também possam atualizar o prazo (não apenas o criador).

```sql
DROP POLICY "Users can update their deadlines in tenant" ON deadlines;
CREATE POLICY "Users can update their deadlines in tenant"
ON deadlines FOR UPDATE TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
  AND (
    auth.uid() = user_id
    OR auth.uid() = advogado_responsavel_id
    OR is_tagged_in_deadline(id, auth.uid())
  )
);
```

### B. DB Function: Buscar nome do projeto sem depender de RLS de projects
Criar uma function `security definer` que retorna nome e cliente de um projeto pelo ID, para uso no fetch de deadlines.

```sql
CREATE OR REPLACE FUNCTION get_project_basic_info(project_ids uuid[])
RETURNS TABLE(id uuid, name text, client text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.client
  FROM projects p
  WHERE p.id = ANY(project_ids)
    AND p.tenant_id = get_user_tenant_id();
$$;
```

### C. Frontend: Usar a function para preencher nomes de projetos
Após o fetch de deadlines, coletar `project_id`s cujo join retornou NULL e buscar via `rpc('get_project_basic_info')` para preencher `projectName` e `clientName`.

### D. Dados: Marcar o prazo "CONFECÇÃO DE LAUDO..." como concluído
Após a correção de RLS, o Wesley poderá concluir novamente. Mas como ele já tentou, podemos marcar diretamente no banco com o comentário (se o usuário preferir).

