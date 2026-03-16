

# Fix: Dados não carregam no primeiro login do Super Admin

## Problema
O `useEffect` inicial chama `loadData()` antes de haver sessão (dados voltam vazios por RLS). Quando o login acontece, o `onAuthStateChange` chama apenas `checkSuperAdmin()` mas nunca recarrega os dados.

## Solução
No callback do `onAuthStateChange`, após o `checkSuperAdmin()` confirmar que é super admin, chamar `loadData()` para recarregar `systemTypes` e `tenants` com a sessão autenticada.

## Arquivo a modificar
**`src/hooks/useSuperAdmin.ts`** — linhas 272-279: dentro do `onAuthStateChange`, após `checkSuperAdmin()`, chamar `loadData()`.

```typescript
if (newSession) {
  setTimeout(async () => {
    const isAdmin = await checkSuperAdmin();
    if (isAdmin) {
      await loadData();
    }
  }, 0);
}
```

Uma mudança de ~3 linhas. O `checkSuperAdmin` já retorna `boolean`, então basta usá-lo para decidir se carrega os dados.

