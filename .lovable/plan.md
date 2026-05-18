# Conta global de suporte: `suporte@vouti.co`

## Causa raiz
Hoje `suporte@vouti.co` é uma conta comum, vinculada a um único tenant em `profiles.tenant_id` e com um único `user_roles(admin, tenant=Solvenza)`. Por isso:
- Ao logar em `/oliveira/auth` não vira admin do Oliveira (RLS olha `get_user_tenant_id()` que vem do profile).
- Aparece nas listagens de usuários (Super-Admin global e drawer de cada tenant).

## Correção
Tornar a conta um "ghost support account": invisível nas listagens e que, ao logar via `/{slug}/auth`, ganha papel `admin` automaticamente naquele tenant.

### 1. Marcação da conta
- Adicionar coluna `is_support boolean not null default false` em `profiles`.
- Marcar `is_support = true` para o user_id de `suporte@vouti.co`.
- Não usar `super_admins`: queremos manter o Super-Admin separado (suporte é admin de tenant, não dono do SaaS).

### 2. Acesso automático ao tenant atual (login via `/{slug}/auth`)
No `AuthContext.fetchUserRoleAndTenant`, quando `profile.is_support === true` e existe `urlTenantId`:
1. `UPDATE profiles SET tenant_id = urlTenantId WHERE user_id = suporte` (faz `get_user_tenant_id()` retornar o tenant correto para RLS).
2. `INSERT INTO user_roles (user_id, role, tenant_id) VALUES (suporte, 'admin', urlTenantId) ON CONFLICT DO NOTHING` (garante linha de admin no tenant).
3. Setar estado local: `userRole='admin'`, `userRoles=['admin']`, `tenantId=urlTenantId`.

Operações 1 e 2 ficam em uma RPC `support_assume_tenant(p_tenant_id uuid)` com `SECURITY DEFINER`, que valida internamente que o caller tem `is_support = true`. Assim o cliente não pode forçar a manobra para outros usuários.

### 3. Invisibilidade
Filtrar `is_support = true` em todas as listagens:
- `src/components/SuperAdmin/SuperAdminUsersList.tsx` (já filtra `RESTRICTED_DOMAINS`; adicionar filtro por `is_support`).
- `src/components/Admin/RoleManagement.tsx`
- `src/components/Admin/UserManagement.tsx`
- `src/components/Admin/UserManagementDrawer.tsx`
- `src/components/SuperAdmin/TenantUsersDrawer.tsx` (usa `SuperAdminUsersList`, herda filtro).

Selects passam a incluir `is_support` no `select` e ignorar a linha.

Também filtrar nos seletores de usuário (mentions, agenda, prazos, etc.) — fazer busca por usos de `from('profiles').select(...full_name...)` e adicionar `.eq('is_support', false)` ou filtro client-side. Lista de arquivos a varrer na implementação:
```text
src/hooks/useColaboradores.ts
src/components/Common/TenantMentionInput.tsx
src/components/Agenda/UserTagSelector.tsx
src/components/Planejador/*  (participants)
src/components/CRM/* (atribuições)
```
Critério: qualquer query que retorne profiles para exibição/seleção humana → filtra.

### 4. Edição e exclusão
- Mesmo via Super-Admin, a conta não aparece e não pode ser editada pela UI (some das listagens). 
- Para gerenciar (trocar senha, etc.), usar diretamente o Supabase Auth dashboard.

## Arquivos afetados
- Nova migration: coluna `profiles.is_support`, flag no user atual, RPC `support_assume_tenant`.
- `src/contexts/AuthContext.tsx` — checagem `is_support` + chamada da RPC quando há `urlTenantId`.
- `src/components/SuperAdmin/SuperAdminUsersList.tsx` — filtro.
- `src/components/Admin/RoleManagement.tsx`, `UserManagement.tsx`, `UserManagementDrawer.tsx` — filtro.
- Hooks/componentes de seleção de usuário que listam profiles humanos — filtro.

## Impacto
1. **Usuário final:** você (com `suporte@vouti.co`) consegue logar em qualquer `/{slug}/auth` e cai como admin do tenant daquela URL. Para usuários reais dos tenants, nada muda visualmente — a conta suporte some das listagens, dos seletores de menção, de atribuição de tarefas, etc.
2. **Dados:**
   - Migration adiciona 1 coluna boolean em `profiles` (default false → linhas existentes inalteradas).
   - A cada login da conta suporte em um tenant, 1 UPDATE em `profiles` e 1 INSERT idempotente em `user_roles`. Volume desprezível.
   - RLS continua usando `get_user_tenant_id()`/`has_role_in_tenant()` — sem mudanças nas policies existentes.
3. **Riscos colaterais:**
   - A conta passa a ter linhas `admin` em `user_roles` para cada tenant que você visitar. Aparece em auditorias de role, mas como o profile é `is_support`, filtros do front escondem.
   - Se algum relatório lista `user_roles` direto (sem join com profiles) ela aparece. Mitigação: nos pontos críticos, fazer join e filtrar.
   - `get_user_tenant_id()` muda a cada login: se você abrir dois tenants em abas diferentes simultaneamente, a última a logar "ganha" o profile.tenant_id, e a aba antiga passa a renderizar dados errados ao próximo refresh. Aceitável para uso de suporte (1 tenant por vez).
4. **Quem é afetado:**
   - Você (dono): ganha login universal.
   - Admins de tenants: deixam de ver `suporte@vouti.co` em qualquer lista.
   - Demais usuários: nenhum impacto.

## Validação
1. Marcar `is_support=true`, rodar migration.
2. Logout, abrir `/solvenza/auth`, logar com suporte → entra como admin do Solvenza.
3. Logout, abrir `/oliveira/auth`, logar com suporte → entra como admin do Oliveira.
4. Logado como outro admin do Solvenza, abrir tela de Usuários → `suporte@vouti.co` não aparece.
5. Logado no Super-Admin, abrir `SuperAdminUsuarios` e o drawer de qualquer tenant → não aparece.
6. Abrir seletor de menção/atribuição em CRM/Agenda/Planejador → não aparece.
