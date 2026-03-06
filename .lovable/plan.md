

## Diagnóstico: Drawer reseta ao trocar de aba

### Causa raiz

O problema está em `DashboardLayout.tsx` (linhas 79-177). O canal Realtime `profiles-changes` é criado **dentro** de `loadUsers()`, e o callback do canal chama `loadUsers()` novamente. Isso causa:

1. Cada chamada a `loadUsers()` cria um **novo** canal sem remover o anterior (o cleanup `return` na linha 171 nunca é executado pelo `useEffect`)
2. Canais se acumulam infinitamente
3. Quando o usuário volta à aba, o Supabase Realtime **reconecta** todos os canais acumulados, disparando callbacks
4. `loadUsers()` chama `setUsersLoading(true)` (linha 86), causando re-render completo do layout
5. Esse re-render cascata nos drawers filhos causa o "refresh" visível

### Correções

#### `src/components/Dashboard/DashboardLayout.tsx`

1. **Extrair `loadUsers` para fora do useEffect** como função estável (via `useCallback`)
2. **Mover a subscription do canal para fora de `loadUsers`**, diretamente no `useEffect`, com cleanup adequado
3. **Não setar `usersLoading(true)` em recarregamentos** — só na primeira carga. Isso evita flash de loading nos re-renders silenciosos

```text
ANTES (bugado):
useEffect(() => {
  const loadUsers = async () => {
    setUsersLoading(true);        // ← causa re-render
    // ... fetch ...
    const channel = supabase      // ← canal DENTRO de loadUsers
      .channel('profiles-changes')
      .on(...)
      .subscribe();               // ← nunca cleanup
    return () => removeChannel(); // ← return ignorado
  };
  loadUsers();
}, [tenantId]);

DEPOIS (corrigido):
useEffect(() => {
  let isMounted = true;
  const loadUsers = async (silent = false) => {
    if (!silent) setUsersLoading(true);
    // ... fetch ...
    if (isMounted) { setUsers(...); setUsersLoading(false); }
  };

  loadUsers(false);               // carga inicial com loading

  const channel = supabase        // canal FORA de loadUsers
    .channel('profiles-changes')
    .on('postgres_changes', ..., () => loadUsers(true))  // silent
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);  // cleanup correto
  };
}, [tenantId]);
```

Resultado: ao trocar de aba, o canal reconecta mas não dispara re-render visível, e o drawer permanece intacto.

