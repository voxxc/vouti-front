

## Pre-carregamento invisivel da Controladoria com polling silencioso

### Abordagem

Atualmente, o `ControladoriaContent` so monta quando o drawer abre (`open=true`), pois o Sheet do Radix usa portal e so renderiza o conteudo quando esta aberto. A ideia e:

1. **Pre-renderizar o `ControladoriaContent` de forma invisivel** no `DashboardLayout`, fora do Sheet, usando `visibility: hidden` + `position: absolute` + `pointer-events: none`. Isso faz o React montar o componente, executar os hooks (carregar dados do Supabase), mas sem ocupar espaco visual nem ser interagivel.

2. **Quando o drawer abrir**, o conteudo ja estara em memoria (cache do `useControladoriaCache` ja preenchido + estado dos componentes preservado). A percepcao sera de carregamento instantaneo.

3. **Adicionar polling silencioso de 2 minutos** no `useControladoriaCache` -- um `setInterval` que chama `refreshData()` a cada 120s sem mostrar indicador visual (sem setar `isRefreshing`). Imperceptivel, igual ao dashboard.

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/Dashboard/DashboardLayout.tsx` | Adicionar div invisivel com `ControladoriaContent` para pre-carregamento |
| `src/hooks/useControladoriaCache.ts` | Adicionar polling silencioso de 2 min (silent refresh sem indicador visual) |

### Detalhes tecnicos

**DashboardLayout.tsx** -- Adicionar antes dos drawers:

```
{/* Pre-carregamento invisivel da Controladoria */}
<div
  className="fixed"
  style={{ visibility: 'hidden', position: 'absolute', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
  aria-hidden="true"
>
  <ControladoriaContent />
</div>
```

Isso monta o componente e seus hooks (useControladoriaCache, useOABs, etc.) em background. Quando o drawer abrir, o useControladoriaCache ja tera dados em memoria -- o cache sera compartilhado porque o hook usa localStorage + estado do React.

**useControladoriaCache.ts** -- Adicionar apos o real-time subscription:

```
// Polling silencioso a cada 2 minutos
useEffect(() => {
  const POLLING_INTERVAL = 2 * 60 * 1000; // 2 minutos

  const interval = setInterval(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [freshMetrics, freshOabs] = await Promise.all([
        fetchMetricsOptimized(),
        fetchOABsOptimized(user.id)
      ]);

      setMetrics(freshMetrics);
      setOabs(freshOabs);

      saveToLocalStorage({
        metrics: freshMetrics,
        oabs: freshOabs,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('[Polling] Erro silencioso:', error);
    }
  }, POLLING_INTERVAL);

  return () => clearInterval(interval);
}, []);
```

Nota: Este polling NAO seta `isRefreshing = true`, entao nenhum spinner aparece. E completamente imperceptivel para o usuario.

### Resultado esperado

- Ao entrar no dashboard, a Controladoria carrega dados em background (invisivel)
- Ao clicar no drawer Controladoria, os dados ja estao prontos -- abertura instantanea
- A cada 2 minutos, os dados sao atualizados silenciosamente sem nenhum indicador visual

