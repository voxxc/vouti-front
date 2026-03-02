

## Novo Perfil: Perito

O perfil `perito` terá acesso a **Agenda**, **Projetos** e **Extras**. Seguirá o mesmo padrão do `estagiario` — adicionado ao enum e replicado em todos os pontos necessários.

### Alterações

**1. Banco de dados — SQL Migration**
- Adicionar `'perito'` ao enum `app_role`
- Atualizar funções `get_users_with_roles` e `get_users_with_roles_by_tenant` com prioridade para `perito` (ex: prioridade 0, junto com estagiario, ou -1)

**2. Edge Functions**
- `supabase/functions/create-user/index.ts` — adicionar `'perito'` ao `validRoles`
- `supabase/functions/admin-set-user-roles/index.ts` — adicionar `'perito'` ao `validRoles`

**3. Frontend — Tipos e Auth**
- `src/types/user.ts` — adicionar `'perito'` ao union type `role`
- `src/contexts/AuthContext.tsx` — adicionar `'perito'` ao type `UserRole` e `rolePriority` (prioridade -1)
- `src/pages/Dashboard.tsx` linha 42 — adicionar `'perito'` ao cast do role

**4. Sidebar — Permissões específicas**
- `src/components/Dashboard/DashboardSidebar.tsx` — adicionar `'perito'` nas seções:
  - `projetos` ✅
  - `agenda` ✅
  - (NÃO em controladoria, financeiro, clientes, documentos, reuniões)
- `extras` já é visível para todos

**5. Dashboard Metrics**
- `src/components/Dashboard/RoleMetricsPanel.tsx` — adicionar case `'perito'` apontando para `AdvogadoMetrics`
- `src/components/Dashboard/DashboardLayout.tsx` — adicionar `'perito': -1` ao `rolePriority`

**6. UI de gerenciamento**
- `src/components/Admin/UserManagementDrawer.tsx` — adicionar `{ value: 'perito', label: 'Perito' }` ao `ROLE_OPTIONS`
- `src/components/Admin/RoleManagement.tsx` — adicionar ao `AppRole`, `roleLabels` e `roleVariants`
- `src/pages/AdminRoles.tsx` — adicionar descrição do Perito
- `src/components/Project/ProjectParticipants.tsx` — adicionar label e cor para `'perito'`

