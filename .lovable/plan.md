## Causa raiz

Hoje a Controladoria só começa a buscar dados **quando o usuário clica no item do sidebar**:

- `useControladoriaCache` carrega KPIs (cache local de 5min existe e funciona bem).
- O conteúdo pesado (`CentralAndamentosNaoLidos`, `CentralPrazosConcluidos`, `ControladoriaIndicadores`, `OABManager`) só monta após a navegação — cada um dispara suas próprias queries no `useEffect`.
- O `prefetch` no hover do sidebar (`prefetchControladoria`) só popula a métrica de KPI; as listas pesadas não são tocadas.
- Existe `prefetchAllPagesAfterLogin` em `usePrefetchPages.ts`, **mas ninguém invoca essa função** (busca por uso retorna 0).

Resultado: ao clicar em Controladoria, o usuário aguarda 2-4 requests serializadas em uma página densa.

## Correção

Estratégia em 3 camadas (todas silenciosas, sem skeleton no fluxo atual do usuário):

### 1. Disparar prefetch pós-login (silencioso)
Invocar `prefetchAllPagesAfterLogin` no `AuthContext` logo após o login resolver, dentro de `requestIdleCallback` (fallback `setTimeout 1500ms`). Isso aquece KPIs de Dashboard, Projects e Controladoria sem competir com o render inicial.

### 2. Estender o prefetch da Controladoria para incluir as listas pesadas
Hoje `prefetchControladoriaDataInternal` só busca contagens. Adicionar prefetch das **mesmas queries** que `CentralAndamentosNaoLidos`, `CentralPrazosConcluidos` e `ControladoriaIndicadores` usam, com `queryKey` compartilhada. Os componentes serão refatorados (mínimo) para consumir via `useQuery` com a chave já populada — assim, ao montar, recebem `data` instantaneamente.

Se algum desses componentes hoje usa `useState/useEffect` em vez de React Query, será migrado para `useQuery` (mudança local, sem alterar a lógica de fetch).

### 3. Aquecer no hover do sidebar (já existe, ampliar)
O `prefetchControladoria` no `DashboardSidebar` continuará disparando — só que agora aquece também as listas pesadas (mesmo conjunto da camada 2). Quem passar o mouse já chega em tela pronta.

### 4. Manter cache localStorage para reabertura
O `useControladoriaCache` já persiste KPIs por 5min. Estender o padrão para salvar também o snapshot das contagens de "andamentos não lidos" e "prazos concluídos" (apenas números), para o badge aparecer instantaneamente mesmo antes do React Query revalidar.

## Arquivos afetados

- `src/contexts/AuthContext.tsx` — disparar `prefetchAllPagesAfterLogin` em idle após login bem-sucedido.
- `src/hooks/usePrefetchPages.ts` — ampliar `prefetchControladoriaDataInternal` com as queries de andamentos não lidos, prazos concluídos e indicadores.
- `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` — migrar fetch para `useQuery` com a queryKey prefetched.
- `src/components/Controladoria/CentralPrazosConcluidos.tsx` — idem.
- `src/components/Controladoria/ControladoriaIndicadores.tsx` — idem.
- `src/components/Controladoria/CentralControladoria.tsx` — persistir `totalNaoLidos` em cache local para badge instantâneo.

Nenhuma alteração em RLS, edge functions ou banco de dados.

## Impacto

**1. Usuário final (UX)**
- Ao clicar em Controladoria, a tela aparece praticamente preenchida em vez de mostrar skeletons por 2-4s.
- O badge "Andamentos Não Lidos" no menu já reflete um número plausível antes mesmo de carregar.
- Refresh em background continua acontecendo (indicador "Atualizando..." já existente).

**2. Dados (banco/performance)**
- ~3-4 queries extras disparadas em idle logo após login para cada usuário (uma vez por sessão). São as **mesmas queries** que aconteceriam ao abrir Controladoria — apenas adiantadas.
- Sem nova carga sustentada: o React Query reutiliza o cache (`staleTime` 2-5min).
- Realtime subscriptions permanecem como estão.

**3. Riscos colaterais**
- Para usuários que **nunca** abrem Controladoria (ex: perfil financeiro puro), há custo extra de 3-4 queries inúteis no login. Mitigação: condicionar o prefetch a `hasAccess('controladoria')` baseado em roles (já mapeado em `DashboardSidebar`).
- Possível "flash" se cache localStorage estiver stale: o número antigo aparece e logo é substituído. Já é o comportamento atual de KPIs e não causou queixas.

**4. Quem é afetado**
- Todos os tenants e perfis com acesso à Controladoria (advogado, controller, estagiário, admin).
- Demais perfis ignoram (gated por role).

## Validação

1. Login limpo (limpar localStorage) → conferir no console os logs `[Prefetch] Controladoria iniciado` em ~1.5s após login, **sem** estar na rota /controladoria.
2. Clicar em Controladoria → tela deve aparecer com dados imediatamente; aba Andamentos Não Lidos preenchida sem skeleton.
3. Network: ao clicar em Controladoria, **0 ou 1** request nova (apenas revalidação se cache stale).
4. Perfil financeiro puro (sem acesso) → nenhum prefetch de Controladoria nos logs.
5. Hover no item Controladoria do sidebar com cache frio → dispara as queries; aguardar 1s e clicar → instantâneo.
