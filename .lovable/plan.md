

## Reduzir polling para 4 segundos em todo o sistema

### Mudancas

Dois arquivos precisam ser atualizados:

| Arquivo | De | Para |
|---|---|---|
| `src/hooks/useReunioes.ts` | `setInterval(..., 30000)` | `setInterval(..., 4000)` |
| `src/components/Dashboard/Metrics/AgendaMetrics.tsx` | `staleTime: 15 * 1000` / `refetchInterval: 30 * 1000` | `staleTime: 2 * 1000` / `refetchInterval: 4 * 1000` |

Isso vale para todos os usuarios de todos os tenants, pois sao configuracoes globais no codigo frontend.

O `staleTime` no AgendaMetrics sera ajustado para 2 segundos (metade do intervalo de polling) para garantir que os dados sejam considerados "frescos" por menos tempo que o ciclo de refetch.

