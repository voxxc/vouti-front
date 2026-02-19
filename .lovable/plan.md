

## Adicionar polling nas Reunioes e no Dashboard da Fabieli

### Problemas identificados

1. **Reunioes nao aparecem em tempo real**: O hook `useReunioes` busca dados apenas uma vez no mount e quando a data selecionada muda. Nao tem polling nem realtime subscription. Se alguem marca uma reuniao, o outro usuario so ve ao recarregar a pagina.

2. **Dashboard da Fabieli (role: agenda) nao atualiza**: O `AgendaMetrics` tem `refetchInterval: 5 * 60 * 1000` (5 minutos), que e muito lento para atualizacoes em tempo real.

### Correcoes

**1. Hook `useReunioes.ts` - Adicionar polling de 30 segundos**

Adicionar um `setInterval` que chama `fetchReunioes()` a cada 30 segundos, garantindo que novas reunioes aparecem automaticamente na pagina sem precisar recarregar.

```text
useEffect(() => {
  fetchReunioes();
  const intervalId = setInterval(() => {
    fetchReunioes();
  }, 30000); // 30 segundos
  return () => clearInterval(intervalId);
}, [selectedDate]);
```

Nota: o `setLoading(true)` sera ajustado para nao mostrar skeleton a cada poll - apenas no primeiro carregamento.

**2. `AgendaMetrics.tsx` - Reduzir refetchInterval para 30 segundos**

Mudar o `refetchInterval` de 5 minutos para 30 segundos, e o `staleTime` para 15 segundos:

```text
staleTime: 15 * 1000,        // 15 segundos
refetchInterval: 30 * 1000,  // 30 segundos
```

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useReunioes.ts` | Adicionar polling de 30s no useEffect + nao mostrar loading no refetch |
| `src/components/Dashboard/Metrics/AgendaMetrics.tsx` | Reduzir refetchInterval para 30s |
