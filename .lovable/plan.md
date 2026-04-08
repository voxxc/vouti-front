

## Plano: Restringir SELECT do bucket task-attachments ao projeto correto

### Problema
A política SELECT atual permite que qualquer usuário que seja colaborador em **qualquer** projeto leia anexos de **todos** os projetos. A verificação é `EXISTS (SELECT 1 FROM project_collaborators WHERE user_id = auth.uid())` sem filtrar por projeto.

### Solução
Reescrever a política SELECT para verificar se o arquivo pertence a um projeto que o usuário tem acesso, usando a tabela `task_files` (que liga `file_path` ao `task_id`) e `tasks` (que liga ao `project_id`).

### Migração SQL

```sql
DROP POLICY IF EXISTS "Users can view task attachments on accessible projects" ON storage.objects;

CREATE POLICY "Users can view task attachments on accessible projects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      -- Super admin bypass
      is_super_admin(auth.uid())
      -- Admin no tenant
      OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
      -- Arquivo pertence a um projeto que o usuário criou ou é colaborador
      OR EXISTS (
        SELECT 1
        FROM task_files tf
        JOIN tasks t ON t.id = tf.task_id
        WHERE tf.file_path = name
          AND t.tenant_id = get_user_tenant_id()
          AND (
            t.project_id IN (SELECT p.id FROM projects p WHERE p.created_by = auth.uid())
            OR t.project_id IN (SELECT pc.project_id FROM project_collaborators pc WHERE pc.user_id = auth.uid())
          )
      )
    )
  );
```

Também corrigir a política INSERT para incluir tenant scoping:
```sql
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;

CREATE POLICY "Users can upload task attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Impacto
- Zero mudança no frontend (paths e queries continuam iguais)
- Admins do tenant mantêm acesso a todos os arquivos do tenant
- Usuários comuns só veem arquivos de projetos onde são dono ou colaborador
- Upload já exige que o primeiro segmento seja o user_id (consistente com o código atual)

### Arquivo a criar
- `supabase/migrations/xxx_fix_task_attachments_cross_project_read.sql`

