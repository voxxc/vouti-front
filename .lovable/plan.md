

## Novo Perfil: Estagiário(a)

O perfil `estagiario` terá as mesmas permissões e visões do `advogado`, apenas com nome de exibição diferente.

### Alterações necessárias

**1. Banco de dados — Migração SQL**
- Adicionar `'estagiario'` ao enum `app_role`
- Adicionar `'estagiario'` à prioridade nas funções `get_users_with_roles` e `get_users_with_roles_by_tenant` (prioridade 0, abaixo de advogado)

**2. Edge Functions — validRoles**
- `supabase/functions/create-user/index.ts` — adicionar `'estagiario'` ao array `validRoles`
- `supabase/functions/admin-set-user-roles/index.ts` — adicionar `'estagiario'` ao array `validRoles`

**3. Frontend — Tipo UserRole**
- `src/types/user.ts` — adicionar `'estagiario'` ao union type `role`
- `src/contexts/AuthContext.tsx` — adicionar `'estagiario'` ao type `UserRole` e ao `rolePriority` (prioridade 0)

**4. Frontend — Sidebar (mesmas permissões do advogado)**
- `src/components/Dashboard/DashboardSidebar.tsx` — adicionar `'estagiario'` em todas as seções onde `'advogado'` aparece no `sectionRoleMap`

**5. Frontend — Dashboard metrics**
- `src/components/Dashboard/RoleMetricsPanel.tsx` — adicionar case `'estagiario'` apontando para `AdvogadoMetrics`
- `src/components/Dashboard/DashboardLayout.tsx` — adicionar `'estagiario'` ao `rolePriority`

**6. Frontend — UI de gerenciamento de roles**
- `src/components/Admin/RoleManagement.tsx` — adicionar `estagiario: 'Estagiário(a)'` ao `roleLabels` e tipo `AppRole`
- `src/components/Admin/UserManagementDrawer.tsx` — adicionar ao `ROLE_OPTIONS` e labels
- `src/pages/AdminRoles.tsx` — adicionar descrição do perfil Estagiário(a) na lista explicativa
- `src/components/Project/ProjectParticipants.tsx` — adicionar label e cor para `estagiario`

**7. Frontend — Outras referências**
- `src/pages/Dashboard.tsx` — adicionar `'estagiario'` ao union type do `currentUserRole`

