

## Diagnóstico: Erro 504 (Gateway Timeout)

Todos os POSTs recentes para `judit-sync-monitorados` retornam **504** com ~150 segundos de execução. A função tenta processar **186 processos monitorados** em uma única chamada, excedendo o limite de 150s das Edge Functions do Supabase.

Para cada processo, a função faz 2 chamadas HTTP à Judit API (tracking + responses) + queries ao banco. Com 186 processos em batches de 10, são ~19 batches sequenciais, cada um fazendo 20+ requests HTTP paralelos. Isso ultrapassa o timeout.

## Plano de Correção

### Abordagem: Processamento por tenant com paginação

Modificar `supabase/functions/judit-sync-monitorados/index.ts` para:

1. **Aceitar parâmetros de paginação** (`offset`, `limit`) no body da requisição, com limite padrão de 30 processos por chamada
2. **Retornar flag `has_more`** indicando se há mais processos a processar
3. **Reduzir batch size** de 10 para 5 para evitar rate limiting

### Frontend: Loop automático de sync

Modificar `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` para:

1. **Chamar a função em loop** — cada chamada processa 30 processos, ao receber `has_more: true`, dispara automaticamente a próxima chamada com `offset` incrementado
2. **Acumular resultados** progressivamente no state
3. **Mostrar progresso** durante a sincronização (ex: "Processando 30/186...")
4. **Tratar erro parcial** — se uma chamada falha, os resultados anteriores são preservados

### Detalhes técnicos

**Edge Function** — novas props no body:
```ts
{ tenant_id?, offset?: number, limit?: number }
```
Retorno inclui: `{ ...results, has_more: boolean, next_offset: number }`

**Frontend** — mutation recursiva:
```ts
// Loop: chama sync com offset crescente até has_more === false
// Acumula resultados parciais em state para feedback imediato
```

Essa abordagem garante que cada chamada processe no máximo 30 processos (~30-40s), bem dentro do limite de 150s.

