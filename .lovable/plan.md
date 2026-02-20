

## Correcao: Drawer recarregando ao voltar de outra aba

### Causa

O TanStack React Query tem o comportamento padrao `refetchOnWindowFocus: true`. Quando voce sai da aba e volta, ele refaz todas as queries ativas, o que causa estados de "loading" nos drawers abertos -- dando a impressao de que a pagina inteira recarregou.

### Correcao

**Arquivo: `src/App.tsx`**

Adicionar `refetchOnWindowFocus: false` nas opcoes default do QueryClient:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,  // <-- adicionar esta linha
    },
  },
});
```

Com isso, os dados so serao refetchados quando explicitamente invalidados (via `queryClient.invalidateQueries`) ou quando o `staleTime` expirar e o componente remontar. Os drawers permanecerao com seus dados intactos ao trocar de aba.

### Impacto

- Nenhum efeito colateral negativo -- o sistema ja usa `invalidateQueries` em todas as mutacoes (criar, editar, deletar) para atualizar os dados
- Real-time subscriptions do Supabase continuam funcionando normalmente
- A unica diferenca e que trocar de aba nao vai mais causar refetch automatico

### Resumo

| Arquivo | Acao |
|---|---|
| `src/App.tsx` | Adicionar `refetchOnWindowFocus: false` na configuracao do QueryClient (1 linha) |

