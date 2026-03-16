

# Remover polling desnecessário: useReunioes + Dashboard Metrics

## 1. `useReunioes.ts` — Polling 4s → Supabase Realtime

**Problema:** `setInterval` de 4 segundos fazendo ~900 queries/hora por usuário.

**Solução:** Substituir o `setInterval` por uma subscription Realtime na tabela `reunioes`. Ao receber qualquer evento (INSERT, UPDATE, DELETE), chamar `fetchReunioes(true)` (silent refetch).

```text
ANTES:
useEffect → fetchReunioes() + setInterval(4s) → fetchReunioes(true)

DEPOIS:
useEffect → fetchReunioes()
useEffect → supabase.channel('reunioes-hook')
              .on('postgres_changes', { event: '*', table: 'reunioes' })
              → fetchReunioes(true)
```

O canal será limpo no cleanup do `useEffect`. A subscription já existe como padrão no projeto (ex: `useReunioesDoMes.ts` usa exatamente esse pattern).

**Arquivo:** `src/hooks/useReunioes.ts` — linhas 173-179: remover `setInterval`, adicionar novo `useEffect` com subscription Realtime.

---

## 2. Dashboard Metrics — Remover `refetchInterval`

**Problema:** 4 componentes com `refetchInterval: 5 * 60 * 1000` geram queries desnecessárias mesmo quando o usuário não está interagindo.

**Solução:** Remover a linha `refetchInterval` de cada um. O React Query já faz `refetchOnWindowFocus: true` por padrão, então os dados atualizam automaticamente quando o usuário volta à aba.

**Arquivos e linhas a alterar:**
- `src/components/Dashboard/Metrics/AdminMetrics.tsx` — linha 87: remover `refetchInterval`
- `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` — linha 56: remover `refetchInterval`
- `src/components/Dashboard/Metrics/ComercialMetrics.tsx` — linha 57: remover `refetchInterval`
- `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx` — linha 171: remover `refetchInterval`

---

## Impacto estimado

| Hook/Componente | Antes | Depois |
|---|---|---|
| `useReunioes` | ~900 queries/hora | Apenas sob demanda (eventos Realtime) |
| 4x Dashboard Metrics | ~48 queries/hora | 0 (só no focus da aba) |
| **Total** | **~950 queries/hora/usuário** | **~0 em idle** |

