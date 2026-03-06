

## Diagnóstico Definitivo: Drawer reseta ao trocar de aba

### Causa raiz real

Os logs mostram claramente:
```
15:26:57 [AuthContext] onAuthStateChange event: SIGNED_IN
15:27:51 [AuthContext] onAuthStateChange event: SIGNED_IN
```

O Supabase dispara eventos `SIGNED_IN` duplicados quando a aba recupera foco (reconexão do GoTrue). Bloqueamos `TOKEN_REFRESHED`, mas **`SIGNED_IN` ainda passa** e executa:

```typescript
setSession(session);      // ← nova referência de objeto
setUser(session?.user);   // ← nova referência de objeto  
setLoading(false);        // ← dispara re-render
```

Isso cascateia: `useAuth()` retorna novos objetos → `DashboardLayout` re-renderiza → todos os drawers filhos re-renderizam → Sheet re-anima (o "refresh" visível).

### Correção

#### `src/contexts/AuthContext.tsx`

No handler de `onAuthStateChange`, para eventos `SIGNED_IN`, verificar se o usuário já está autenticado com o mesmo ID. Se sim, **ignorar** — não chamar `setSession`/`setUser`/`setLoading`:

```typescript
(event, session) => {
  if (event === 'TOKEN_REFRESHED') return;
  
  // Skip duplicate SIGNED_IN for same user (tab focus reconnection)
  if (event === 'SIGNED_IN' && session?.user?.id && 
      session.user.id === lastFetchedUserIdRef.current) {
    console.log('[AuthContext] Skipping duplicate SIGNED_IN for same user');
    return;
  }
  
  // ... rest of existing logic
}
```

Isso é seguro porque:
- O login real já foi processado na primeira vez
- A role e tenant já estão carregados (deduplication via `lastFetchedUserIdRef`)
- A sessão do Supabase se atualiza internamente sem precisar do React state

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/AuthContext.tsx` | Ignorar `SIGNED_IN` duplicados para mesmo usuário |

