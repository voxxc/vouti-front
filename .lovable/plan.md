

## Diagnóstico: O problema ainda persiste

### Causa raiz

O filtro atual no `AuthContext.tsx` bloqueia `TOKEN_REFRESHED` e `SIGNED_IN` duplicados, mas **outros eventos passam**. O Supabase dispara eventos adicionais ao reconectar a aba (ex: `USER_UPDATED`, `MFA_CHALLENGE_VERIFIED`, ou até re-emissão genérica). Qualquer evento não filtrado executa:

```typescript
setSession(session);        // nova referência de objeto
setUser(session?.user);     // nova referência de objeto
```

Mesmo com dados idênticos, React trata como mudança de estado → re-render cascata → drawer "refresha".

Além disso, `getSession()` (linha 85) tem um race condition: se o `SIGNED_IN` duplicado for ignorado (nosso filtro), `initialSessionHandledRef` nunca fica `true` para esse caso, e `getSession()` pode rodar depois e setar estado novamente.

### Correção definitiva

#### `src/contexts/AuthContext.tsx`

Mudar a lógica para: **se já temos um user com o mesmo ID, nunca atualizar `setSession`/`setUser`/`setLoading`**, independente do tipo de evento. Apenas processar se o user ID mudou ou se é logout.

```typescript
(event, session) => {
  // Ignorar token refresh
  if (event === 'TOKEN_REFRESHED') return;
  
  const currentUserId = lastFetchedUserIdRef.current;
  const incomingUserId = session?.user?.id ?? null;
  
  // Se o user não mudou (mesmo ID ou ambos null), ignorar completamente
  if (incomingUserId && incomingUserId === currentUserId) {
    console.log('[AuthContext] Ignoring event for same user:', event);
    return;
  }
  
  // Daqui para baixo: login novo, logout, ou troca de user
  console.log('[AuthContext] Processing auth event:', event);
  setSession(session);
  setUser(session?.user ?? null);
  setLoading(false);
  // ... rest of logic
}
```

E no `getSession()`:

```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  // Só processar se ainda não temos user carregado
  if (!initialSessionHandledRef.current && !lastFetchedUserIdRef.current) {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
    if (session?.user) {
      fetchUserRoleAndTenant(session.user.id);
    }
  }
});
```

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/AuthContext.tsx` | Ignorar TODOS os eventos auth se user ID não mudou, não apenas SIGNED_IN |

