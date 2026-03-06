

## Diagnóstico: Drawer ainda reseta ao trocar de aba

### Causa raiz

O problema tem **duas camadas** que ainda não foram resolvidas:

1. **Tab Discarding do navegador**: Chrome/Edge descartam abas inativas para economizar memória. Quando o usuário volta, a página faz um **reload completo** — todo o estado React é perdido, incluindo `activeDrawer`. Como é `useState(null)`, o drawer volta fechado.

2. **Re-renders silenciosos**: Mesmo sem discard, o `loadUsers` sempre chama `setUsers(mappedUsers)` com um **novo array reference** (mesmo dados iguais). Isso causa re-render do DashboardLayout e de todos os drawers filhos, que recebem novas referências de `onOpenChange` (arrow functions inline), potencialmente causando re-animação do Sheet.

### Correções

#### 1. `DashboardLayout.tsx` — Persistir `activeDrawer` em `sessionStorage`

Substituir `useState<ActiveDrawer>(null)` por um estado que lê/escreve em `sessionStorage`:

```typescript
const [activeDrawer, setActiveDrawerState] = useState<ActiveDrawer>(() => {
  const saved = sessionStorage.getItem('vouti-active-drawer');
  return saved ? (saved as ActiveDrawer) : null;
});

const setActiveDrawer = (drawer: ActiveDrawer) => {
  setActiveDrawerState(drawer);
  if (drawer) {
    sessionStorage.setItem('vouti-active-drawer', drawer);
  } else {
    sessionStorage.removeItem('vouti-active-drawer');
  }
};
```

Isso garante que mesmo com reload completo (tab discard), o drawer reabre automaticamente.

#### 2. `DashboardLayout.tsx` — Evitar `setUsers` desnecessário

No `loadUsers`, comparar dados antes de setar:

```typescript
if (isMounted) {
  setUsers(prev => {
    if (JSON.stringify(prev.map(u => u.id)) === JSON.stringify(mappedUsers.map(u => u.id))) {
      return prev; // Mesma referência = zero re-render
    }
    return mappedUsers;
  });
  setUsersLoading(false);
}
```

#### 3. `DashboardLayout.tsx` — Memoizar `onOpenChange` dos drawers

Usar `useCallback` para as funções `onOpenChange` dos drawers em vez de arrow functions inline:

```typescript
const handleDrawerClose = useCallback((open: boolean) => {
  if (!open) setActiveDrawer(null);
}, []);
```

E passar `handleDrawerClose` para todos os drawers em vez de `(open) => !open && setActiveDrawer(null)`.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/Dashboard/DashboardLayout.tsx` | sessionStorage + comparação de users + memoização |

