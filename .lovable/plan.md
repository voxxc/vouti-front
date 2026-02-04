
# Correção: Vazamento de Projetos Entre Tenants

## Problema Identificado

Projetos do tenant **Solvenza** estão aparecendo no tenant **Oliveira**. Este é um problema crítico de isolamento multi-tenant.

## Causa Raiz

A função `has_role` usada nas RLS policies **não verifica o tenant_id**:

```sql
-- Função atual (PROBLEMÁTICA)
SELECT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = _user_id AND role = _role
  -- NÃO VERIFICA tenant_id!
)
```

Quando a policy `"Admins can view tenant projects"` é avaliada:
```sql
has_role(auth.uid(), 'admin') AND tenant_id = get_user_tenant_id()
```

O `has_role` retorna TRUE se o usuário for admin em **qualquer tenant**, não apenas no tenant correto.

Além disso, a função `is_project_member` também não verifica tenant:
```sql
-- Função atual (PROBLEMÁTICA)
SELECT EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = project_id AND p.created_by = uid
  -- NÃO VERIFICA tenant_id!
)
```

---

## Solução em Duas Camadas

### Camada 1: Banco de Dados (RLS)

Atualizar as RLS policies de `projects` para usar verificação explícita de tenant:

| Policy Atual | Correção |
|--------------|----------|
| `has_role(uid, 'admin')` | `has_role_in_tenant(uid, 'admin', get_user_tenant_id())` |
| `is_project_member(id)` | `is_project_member(id) AND tenant_id = get_user_tenant_id()` |

```sql
-- Recriar policies com verificação de tenant
DROP POLICY IF EXISTS "Admins can view tenant projects" ON projects;
CREATE POLICY "Admins can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  );

DROP POLICY IF EXISTS "Controller can view tenant projects" ON projects;
CREATE POLICY "Controller can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  );

DROP POLICY IF EXISTS "Users can view their projects" ON projects;
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND is_project_member(id)
  );
```

### Camada 2: Frontend (Defesa em Profundidade)

Atualizar `useProjectsOptimized.ts` para filtrar explicitamente por `tenant_id`:

```typescript
// Adicionar filtro de tenant na query
let query = supabase
  .from('projects')
  .select(`...`)
  .eq('tenant_id', tenantId)  // FILTRO ADICIONAL
  .order('name', { ascending: true });
```

Atualizar `auth-helpers.ts` para verificar tenant:

```typescript
export const checkIfUserIsAdminOrController = async (
  userId: string, 
  tenantId?: string
): Promise<boolean> => {
  let query = supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'controller']);
  
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  
  const { data } = await query.maybeSingle();
  return !!data;
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `migrations/` | SQL para recriar RLS policies com verificação de tenant |
| `src/hooks/useProjectsOptimized.ts` | Adicionar `.eq('tenant_id', tenantId)` na query |
| `src/lib/auth-helpers.ts` | Adicionar parâmetro tenantId na verificação de roles |
| `src/components/Search/ProjectQuickSearch.tsx` | Adicionar filtro de tenant (já tem parcialmente) |

---

## Projeto com tenant_id NULL

Há 1 projeto órfão que precisa ser corrigido:

| ID | Nome | Criador |
|----|------|---------|
| `d3749ef6-be1d-4848-8c25-324c7f899433` | EXEMPLOR LTDA | `dyohana.adv@ams.com` |

Este projeto será atribuído ao tenant correto baseado no perfil do criador.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Admin Oliveira vê projetos Solvenza | Cada tenant vê apenas seus próprios projetos |
| RLS sem verificação de tenant | RLS com dupla verificação (role + tenant) |
| Apenas 1 camada de proteção | Duas camadas (RLS + Frontend) |
