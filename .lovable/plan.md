

## Plano de Otimizacao Completa: Queries Redundantes

### Diagnostico

Analisei todo o codebase e identifiquei **3 categorias de desperdicio** que se multiplicam em cada page load:

```text
┌─────────────────────────────────────────────────────────┐
│  PROBLEMA 1: supabase.auth.getUser() repetido          │
│  80 arquivos chamam getUser() independentemente.        │
│  AuthContext ja tem o user cached. Esses 80 arquivos    │
│  poderiam usar useAuth().user em vez de chamar a API.   │
│                                                         │
│  PROBLEMA 2: user_roles consultado N vezes              │
│  17 arquivos fazem SELECT em user_roles pra saber se    │
│  e admin/controller. AuthContext ja tem userRole e       │
│  userRoles cached.                                      │
│                                                         │
│  PROBLEMA 3: getTenantIdForUser() faz query propria     │
│  6 hooks chamam getTenantIdForUser(user.id) que faz     │
│  getUser + profiles query. Desnecessario pois o          │
│  useTenantId() ja retorna do cache do AuthContext.      │
└─────────────────────────────────────────────────────────┘
```

### Impacto estimado por page load

| Tipo de query | Chamadas atuais | Chamadas apos otimizacao |
|---|---|---|
| `auth.getUser()` | 10-15 | 0 (usa `useAuth().user`) |
| `SELECT user_roles` | 4-8 | 0 (usa `useAuth().userRoles`) |
| `SELECT profiles WHERE user_id` | 3-6 | 0 (usa `useTenantId()`) |
| `SELECT super_admins` | 0 (ja resolvido) | 0 |
| **Total queries eliminadas** | **~20-30** | **0** |

---

### Fase 1: Eliminar `getUser()` em componentes com acesso a hook

**Escopo**: Componentes React (pages, components) que ja estao dentro do AuthProvider e chamam `supabase.auth.getUser()` apenas para obter `user.id`.

**Mudanca**: Substituir por `const { user } = useAuth()`.

**Arquivos prioritarios** (os que montam no page load, nao em callbacks de botao):
- `src/components/WhatsApp/context/WhatsAppContext.tsx` - useEffect com getUser
- `src/components/Reunioes/ClienteComentariosTab.tsx` - useEffect com getUser
- `src/components/Financial/ColaboradorComentariosTab.tsx` - useEffect com getUser
- `src/components/Financial/ClienteFinanceiroDialog.tsx` - useEffect com getUser
- `src/components/Project/EtapaModal.tsx` - useEffect com getUser
- `src/components/Admin/UserManagement.tsx` - useEffect com getUser
- `src/components/WhatsApp/sections/WhatsAppContacts.tsx` - useEffect com getUser
- `src/pages/ControladoriaProcessoDetalhes.tsx` - useEffect com getUser
- `src/pages/ProjectView.tsx` - useEffect com getUser

**Nota**: Chamadas dentro de callbacks (onClick, onSubmit) sao menos criticas pois so executam quando o usuario clica. Podem ser migradas depois.

---

### Fase 2: Eliminar queries redundantes a `user_roles`

**Escopo**: 17 arquivos que fazem `SELECT role FROM user_roles WHERE user_id = ...` para verificar se e admin/controller.

**Mudanca**: Usar `useAuth().userRoles` e `useAuth().userRole` que ja estao cacheados.

**Arquivos prioritarios** (montam no page load):
- `src/hooks/useClientes.ts` - query user_roles no fetch
- `src/hooks/useReunioes.ts` - query user_roles no fetch
- `src/pages/Financial.tsx` - query user_roles no useEffect
- `src/pages/ControladoriaProcessoDetalhes.tsx` - query user_roles no useEffect
- `src/pages/ProjectView.tsx` - query user_roles no useEffect
- `src/components/Financial/FinancialContent.tsx` - query user_roles
- `src/components/Financial/FinancialMetrics.tsx` - query user_roles
- `src/components/Dashboard/DashboardLayout.tsx` - query user_roles
- `src/hooks/useControladoriaCache.ts` - fetchOABsOptimized faz query user_roles
- `src/hooks/useOABs.ts` - fetchOABs faz query user_roles

**Mudanca em `auth-helpers.ts`**: As funcoes `checkIfUserIsAdmin` e `checkIfUserIsAdminOrController` podem ser substituidas por uma versao sincrona que recebe os roles do contexto em vez de fazer query.

---

### Fase 3: Eliminar `getTenantIdForUser()`

**Escopo**: 6 hooks que importam e chamam `getTenantIdForUser(user.id)`.

**Mudanca**: Esses hooks ja tem acesso a hooks React, entao podem usar `useTenantId()` diretamente.

**Arquivos**:
- `src/hooks/useControladoriaCache.ts` - `fetchOABsOptimized`
- `src/hooks/useTarefasOAB.ts`
- `src/hooks/useReunioes.ts`
- `src/hooks/useClientes.ts`
- `src/hooks/useClienteEtiquetas.ts`
- `src/hooks/useOABs.ts`

**Problema**: Algumas dessas funcoes sao standalone (fora de componente), como `fetchOABsOptimized`. Para essas, a solucao e receber o `tenantId` como parametro em vez de buscar internamente.

---

### Fase 4: Otimizar `useControladoriaCache`

Este hook tem problemas especificos:
1. Chama `supabase.auth.getUser()` 2x (loadData + refreshData)
2. Chama `getTenantIdForUser()` que faz mais 1 query a profiles
3. Chama `user_roles` para verificar admin/controller
4. Total: **5 queries extras** toda vez que abre a Controladoria

**Mudanca**: Receber `user`, `tenantId`, e `userRoles` como parametros do hook (vindos do AuthContext), eliminando todas as queries internas.

---

### Resumo de arquivos alterados

| Fase | Arquivos | Queries eliminadas |
|---|---|---|
| Fase 1 | ~9 componentes | ~10 getUser/page |
| Fase 2 | ~10 hooks/componentes + auth-helpers.ts | ~6 user_roles/page |
| Fase 3 | 6 hooks | ~6 profiles/page |
| Fase 4 | 1 hook (useControladoriaCache) | ~5 queries/page |
| **Total** | **~25 arquivos** | **~27 queries/page** |

### Ordem de execucao

Recomendo implementar em **2 blocos**:

**Bloco A** (maior impacto, menor risco): Fases 1 + 2 — substituir getUser e user_roles nos componentes que montam no page load. Sao mudancas mecanicas e seguras.

**Bloco B** (requer cuidado): Fases 3 + 4 — refatorar hooks standalone e useControladoriaCache para receber dados do contexto. Precisa ajustar assinaturas de funcao.

