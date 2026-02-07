
# Atualização Automática do Dashboard a Cada 5 Minutos

## Problema

Com o Dashboard sempre montado (fixo por baixo dos drawers), os dados não se atualizam automaticamente. O usuário precisa recarregar a página para ver informações atualizadas.

## Solução

Adicionar `refetchInterval: 5 * 60 * 1000` (5 minutos) em todas as queries do Dashboard para que os dados sejam atualizados automaticamente em segundo plano.

## Situação Atual dos Componentes

| Componente | Método Atual | Tem Atualização Automática? |
|------------|--------------|---------------------------|
| AdminMetrics | React Query | Não |
| AdvogadoMetrics | React Query | Não |
| ComercialMetrics | useEffect | Não |
| FinanceiroMetrics | useEffect | Não |
| AgendaMetrics | useEffect | Não |

## Mudanças Necessárias

### 1. Componentes com React Query (adicionar refetchInterval)

**Arquivos:**
- `src/components/Dashboard/Metrics/AdminMetrics.tsx`
- `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx`

```tsx
const { data: metrics, isLoading: loading } = useQuery({
  queryKey: ['admin-metrics', userId, tenantId],
  queryFn: async () => { ... },
  staleTime: 5 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,  // ADICIONAR ESTA LINHA
  enabled: !!userId && !!tenantId,
});
```

### 2. Componentes com useEffect (migrar para React Query)

**Arquivos:**
- `src/components/Dashboard/Metrics/ComercialMetrics.tsx`
- `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx`
- `src/components/Dashboard/Metrics/AgendaMetrics.tsx`

Transformar de:
```tsx
const [metrics, setMetrics] = useState<Metrics | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchMetrics();
}, [userId]);
```

Para:
```tsx
const { data: metrics, isLoading: loading } = useQuery({
  queryKey: ['comercial-metrics', userId],
  queryFn: fetchMetrics,
  staleTime: 5 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  enabled: !!userId,
});
```

## Benefícios

1. **Atualização automática**: Dados atualizados a cada 5 minutos sem ação do usuário
2. **Consistência**: Todos os componentes seguem o mesmo padrão (React Query)
3. **Performance**: React Query evita refetch desnecessário se os dados ainda estão frescos
4. **Cache inteligente**: Transições entre drawers mostram dados em cache instantaneamente

## Comportamento Esperado

- Dashboard carrega os dados iniciais
- A cada 5 minutos, os dados são atualizados silenciosamente em segundo plano
- O usuário vê os números atualizarem sem precisar fazer nada
- Se o usuário estava em um drawer e volta ao Dashboard, os dados mais recentes já estão disponíveis

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Dashboard/Metrics/AdminMetrics.tsx` | Adicionar `refetchInterval` |
| `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` | Adicionar `refetchInterval` |
| `src/components/Dashboard/Metrics/ComercialMetrics.tsx` | Migrar para React Query com `refetchInterval` |
| `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx` | Migrar para React Query com `refetchInterval` |
| `src/components/Dashboard/Metrics/AgendaMetrics.tsx` | Migrar para React Query com `refetchInterval` |
