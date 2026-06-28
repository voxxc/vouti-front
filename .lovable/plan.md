## Causa raiz

A `Tabs` da Controladoria está **não controlada** (`defaultValue="central"`). Qualquer remontagem do componente — disparada por:

- `useControladoriaCache` (canal realtime `controladoria-realtime-cache` que atualiza estado a cada evento de várias tabelas e pode forçar re-render do pai),
- `NavigationLoadingContext` (mudança de `navigationId` quando um prefetch termina enquanto o usuário já está na página),
- ou um refresh silencioso do `DashboardLayout`,

faz o Radix Tabs reinicializar para o `defaultValue` → volta para "Central". Como o cache realtime dispara em segundos, o usuário percebe como "loop" sempre que tenta ficar na aba "OABs".

## Correção

Tornar a aba **controlada e persistida na URL** via query string (`?tab=minhas-oabs`), de modo que:

1. Remontagens não perdem a aba ativa (lida do `searchParams`).
2. Link/refresh/voltar do navegador preserva o contexto.
3. Não dependemos de estado interno do Radix.

Mudanças em `src/pages/Controladoria.tsx`:

- Substituir `defaultValue` por `value={tab}` + `onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}`.
- `const tab = searchParams.get("tab") ?? "central"`.
- Validar contra a lista `["central","minhas-oabs","push-doc","prazos-of"]` (fallback para `central` se valor inválido).

## Arquivos afetados

- `src/pages/Controladoria.tsx` (único arquivo).

## Impacto

1. **UX**: A aba escolhida fica fixa mesmo quando o cache realtime atualiza em segundo plano. Resolve o loop reportado. URL passa a refletir a aba (`/controladoria?tab=minhas-oabs`), permitindo compartilhar/bookmarkar.
2. **Dados**: Nenhuma alteração de schema, RLS, edge function ou migration.
3. **Riscos colaterais**: Mínimos — apenas leitura/escrita de `searchParams`. Não quebra deep-links existentes (sem `?tab` cai em "central").
4. **Quem é afetado**: Todos os usuários que acessam `/controladoria` em qualquer tenant (admin, controller, financeiro, comercial). Sem efeito em outras telas.

## Validação

- Abrir `/controladoria`, clicar em "OABs" e aguardar 10s com o realtime ativo → aba deve permanecer em "OABs".
- Repetir em "Push-Doc" e "Prazos OF".
- Recarregar página com `?tab=minhas-oabs` → abre direto em OABs.
- Acessar sem query → abre em Central (comportamento atual preservado).