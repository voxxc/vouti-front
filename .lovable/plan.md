

## Plano: Isolar bucket `processo-documentos` por tenant

### Problema
As 3 políticas de storage (SELECT, INSERT, DELETE) no bucket `processo-documentos` verificam apenas `bucket_id = 'processo-documentos'` sem nenhum filtro de tenant. Qualquer usuário autenticado pode acessar documentos de qualquer tenant.

### Solução
Reescrever as 3 políticas usando o mesmo padrão já aplicado em `credenciais-documentos`: exigir que a primeira pasta do path seja o `tenant_id` do usuário.

### Migração SQL

```sql
-- SELECT
DROP POLICY IF EXISTS "Users can view their processos documentos" ON storage.objects;
CREATE POLICY "Users can view their processos documentos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'processo-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );

-- INSERT
DROP POLICY IF EXISTS "Users can upload documentos" ON storage.objects;
CREATE POLICY "Users can upload documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'processo-documentos'
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

-- DELETE
DROP POLICY IF EXISTS "Users can delete their documentos" ON storage.objects;
CREATE POLICY "Users can delete their documentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'processo-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );
```

### Impacto
- O bucket está atualmente vazio e sem uso direto no código frontend (nenhum upload/download encontrado em `src/`)
- Se no futuro for usado, os uploads deverão seguir o padrão `{tenant_id}/...` no path — igual ao `credenciais-documentos`
- Zero mudança no frontend
- Super admins mantêm acesso total (SELECT/DELETE)

### Arquivo a criar
- `supabase/migrations/xxx_fix_processo_documentos_storage_rls.sql`

