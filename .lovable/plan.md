
## Diagnóstico: Loop de Token Refresh causando 429 Rate Limit

### Problema
Os logs de auth mostram **dezenas de token refresh em 1-2 segundos** para a usuária `izabelitabeatriz@icloud.com`, resultando em erros `429: Request rate limit reached`. Isso indica um loop de refresh que impede o carregamento correto do tenant.

### Causas identificadas no `AuthContext.tsx`

1. **Chamada duplicada de `fetchUserRoleAndTenant`**: Tanto o `onAuthStateChange` quanto o `getSession()` disparam a mesma função ao montar, gerando queries duplicadas.

2. **Prefetch pós-login cria QueryClient descartável**: O `signIn` cria `new QueryClient()` a cada login — esse cache é descartado imediatamente, desperdiçando queries e potencialmente causando chamadas extras ao Supabase.

3. **Sem debounce/deduplicação**: Cada evento `TOKEN_REFRESHED` do Supabase dispara `fetchUserRoleAndTenant` novamente, multiplicando as queries.

### Plano de correção

**1. AuthContext — Deduplicar fetchUserRoleAndTenant**
- Adicionar uma flag `fetchingRef` (useRef) para evitar chamadas simultâneas
- No `onAuthStateChange`, só chamar `fetchUserRoleAndTenant` para eventos `SIGNED_IN` e `TOKEN_REFRESHED` (ignorar outros)
- No `getSession`, só chamar se o listener ainda não processou

**2. AuthContext — Corrigir prefetch pós-login**
- Remover `new QueryClient()` dentro do `signIn` — usar import do queryClient global do `App.tsx` ou simplesmente não fazer prefetch dentro do AuthContext (deixar os componentes fazerem ao montar)

**3. AuthContext — Evitar re-fetch em TOKEN_REFRESHED**
- No `onAuthStateChange`, para evento `TOKEN_REFRESHED` apenas atualizar session/user sem chamar `fetchUserRoleAndTenant` novamente (os roles não mudam entre refreshes)

### Arquivos alterados
- `src/contexts/AuthContext.tsx` — deduplicação, guard no listener, remoção do prefetch com QueryClient descartável
