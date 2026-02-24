

## Remover polling do AgendaMetrics

Mudanca simples: no `AgendaMetrics.tsx`, remover o `refetchInterval` e aumentar o `staleTime` do React Query para que os dados so atualizem quando o usuario recarregar a pagina (F5).

### O que muda

No arquivo `src/components/Dashboard/Metrics/AgendaMetrics.tsx`, linhas 53-54:

**Antes:**
```
staleTime: 2 * 1000,
refetchInterval: 4 * 1000,
```

**Depois:**
```
staleTime: Infinity,
```

Isso faz com que:
- Os dados sejam buscados **uma unica vez** ao abrir o Dashboard
- So atualizem com F5 ou ao navegar para outra pagina e voltar
- Reducao de **900 queries/hora para ~1 query/hora** por usuario com role "agenda"

