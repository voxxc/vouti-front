

# Fix: "Sincronizar Todos" reseta a página

## Causa raiz

O `refreshSession()` dentro da mutation de sync dispara o `onAuthStateChange` no `useSuperAdmin.ts`. Esse callback chama `loadData()`, que faz `setLoading(true)`. Como `SuperAdmin.tsx` (linha 111) renderiza um spinner quando `loading === true`, o componente `SuperAdminMonitoramento` é **desmontado**, matando a mutation em andamento.

Quando o loading volta a `false`, o componente remonta do zero — por isso o segundo request volta com `offset: 0`.

## Solução

No `useSuperAdmin.ts`, na função `loadData()`, **não** setar `loading = true` se os dados já foram carregados (ou seja, se já temos `systemTypes` ou `tenants`). Isso faz o reload ser silencioso, sem desmontar a página.

**Arquivo:** `src/hooks/useSuperAdmin.ts` — linhas 109-112

```
ANTES:
const loadData = useCallback(async () => {
  setLoading(true);
  await Promise.all([fetchSystemTypes(), fetchTenants()]);
  setLoading(false);
}, ...);

DEPOIS:
const loadData = useCallback(async () => {
  // Só mostra loading na primeira carga — reloads silenciosos
  const isFirstLoad = systemTypes.length === 0 && tenants.length === 0;
  if (isFirstLoad) setLoading(true);
  await Promise.all([fetchSystemTypes(), fetchTenants()]);
  setLoading(false);
}, ...);
```

Mudança de 2 linhas. Resolve tanto o bug do sync quanto qualquer futuro reload silencioso.

