

## Substituir Realtime por Polling no PrazosCasoTab

### Alteração

**`src/components/Controladoria/PrazosCasoTab.tsx`**

Remover o `useEffect` do Realtime (linhas 128-144) e substituir por polling a cada 5 segundos:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchPrazos(true);
  }, 5000);

  return () => clearInterval(interval);
}, [fetchPrazos]);
```

### 1 arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `PrazosCasoTab.tsx` | Trocar Realtime por polling silencioso a cada 5s |

