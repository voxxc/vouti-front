
# Isolamento Total do Super Admin

## Problema Identificado

Atualmente, quando um Super Admin (ex: `danieldemorais@vouti.co`) tenta criar um novo cliente usando o **mesmo email**, o sistema bloqueia porque verifica se o email já existe na tabela `profiles`.

O Super Admin deveria ser **completamente isolado** dos tenants normais, permitindo:
- Mesmo email em `super_admins` e em um tenant específico
- Usuários completamente separados no `auth.users`
- Nenhuma interferência entre as contas

## Fluxo Atual (com problema)

```text
Tentativa de criar tenant com admin_email = danieldemorais@vouti.co
        │
        ▼
┌───────────────────────────────────────┐
│ Busca em profiles por email           │
│ ─► Encontra o profile do super admin  │
│ ─► Retorna ERRO: "email já existe"    │
└───────────────────────────────────────┘
```

## Solução Proposta

### 1. Modificar `create-tenant-with-admin`

Alterar a verificação de email existente para **excluir super admins** da busca:

```sql
-- Verificar email existente, EXCLUINDO super admins
SELECT user_id FROM profiles 
WHERE email = 'danieldemorais@vouti.co'
  AND user_id NOT IN (SELECT user_id FROM super_admins)
```

### 2. Modificar `create-tenant-admin`

Aplicar a mesma lógica ao verificar usuários existentes via Admin API - ignorar se o user_id for de um super admin.

## Fluxo Corrigido

```text
Tentativa de criar tenant com admin_email = danieldemorais@vouti.co
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ Busca em profiles por email EXCLUINDO super_admins    │
│ ─► Não encontra (super admin é ignorado)              │
│ ─► Cria NOVO usuário em auth.users                    │
│ ─► Cria NOVO profile com tenant_id do novo cliente    │
│ ─► Cria role admin para o novo tenant                 │
└───────────────────────────────────────────────────────┘
```

## Resultado

Após a implementação:

| Contexto | Email | user_id | tenant_id |
|----------|-------|---------|-----------|
| Super Admin | danieldemorais@vouti.co | 8eda80fa-... | NULL |
| Admin Tenant X | danieldemorais@vouti.co | **NOVO-ID** | UUID do tenant X |

Duas contas completamente separadas no sistema.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/create-tenant-with-admin/index.ts` | Excluir super admins da verificação de email existente |
| `supabase/functions/create-tenant-admin/index.ts` | Excluir super admins da verificação de usuário existente |

## Detalhes Técnicos

### Mudança em `create-tenant-with-admin/index.ts`

**Antes (linhas 106-118):**
```typescript
const { data: existingProfile } = await supabaseAdmin
  .from('profiles')
  .select('user_id')
  .eq('email', admin_email)
  .maybeSingle();

if (existingProfile) {
  return new Response(
    JSON.stringify({ error: 'A user with this email already exists' }),
    ...
  );
}
```

**Depois:**
```typescript
// Buscar super admins para excluir da verificação
const { data: superAdminUserIds } = await supabaseAdmin
  .from('super_admins')
  .select('user_id');

const superAdminIds = superAdminUserIds?.map(sa => sa.user_id) || [];

// Verificar se email existe em profiles (excluindo super admins)
const { data: existingProfile } = await supabaseAdmin
  .from('profiles')
  .select('user_id')
  .eq('email', admin_email)
  .maybeSingle();

// Só bloqueia se existir E não for super admin
if (existingProfile && !superAdminIds.includes(existingProfile.user_id)) {
  return new Response(
    JSON.stringify({ error: 'A user with this email already exists' }),
    ...
  );
}
```

### Mudança em `create-tenant-admin/index.ts`

Similar alteração para ignorar usuários que são super admins ao verificar emails existentes via Admin API.

## Considerações de Segurança

- Super admins continuam invisíveis nas listagens de tenants (já implementado via `get_users_with_roles`)
- Cada conta (super admin vs admin de tenant) terá credenciais separadas
- O login do super admin continua em `/super-admin`, o login do tenant em `/{slug}/auth`
- Não há vazamento de dados entre os contextos
