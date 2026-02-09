
## Plano: Corrigir RLS para Permitir Edição da Mensagem de Boas-Vindas

### Diagnóstico

O problema está nas **RLS policies** da tabela `whatsapp_lead_triggers`. As políticas atuais exigem que `tenant_id IS NOT NULL`:

```sql
-- Política atual (INCORRETA)
CREATE POLICY "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers
  FOR SELECT USING (
    tenant_id IS NOT NULL AND (...)  -- ❌ Bloqueia registros com tenant_id NULL
  );
```

O registro do Super Admin tem `tenant_id = NULL`, então:
- SELECT não retorna o registro
- UPDATE não consegue modificar o registro
- A mensagem de boas-vindas não salva

---

### Solução

Modificar as RLS policies para permitir que Super Admins acessem registros onde `tenant_id IS NULL`:

```sql
-- Política corrigida
CREATE POLICY "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers
  FOR SELECT USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()) 
    OR 
    (tenant_id IS NULL AND is_super_admin(auth.uid()))  -- ✅ Super Admin acessa NULL
  );
```

---

### Migração SQL

```sql
-- Remover policies antigas
DROP POLICY IF EXISTS "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_insert" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_update" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_delete" ON public.whatsapp_lead_triggers;

-- Criar policies corrigidas
CREATE POLICY "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers
  FOR SELECT USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_insert" ON public.whatsapp_lead_triggers
  FOR INSERT WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_update" ON public.whatsapp_lead_triggers
  FOR UPDATE USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_delete" ON public.whatsapp_lead_triggers
  FOR DELETE USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );
```

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Super Admin não consegue ver registro | Super Admin vê e edita |
| UPDATE silenciosamente falha | UPDATE funciona normalmente |
| Mensagem não salva | Mensagem salva com sucesso |

---

### Arquivo a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/[timestamp]_fix_lead_triggers_rls.sql` | Corrigir RLS policies |
