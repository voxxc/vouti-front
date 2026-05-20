# Ativar "Carregar Andamentos" na aba Geral (Controladoria)

## Causa raiz
O botão "Carregar Andamentos" exibido na aba **Geral** da Controladoria (que lista processos de todas as OABs) usa o hook `useAllProcessosOAB`. A função `carregarDetalhes` desse hook é apenas um **stub** — apenas marca `detalhes_carregados: true` no estado local, sem invocar a Edge Function que de fato busca os andamentos na Judit.

Já existe a implementação correta em `useOABs.ts` (aba específica de cada OAB), que chama `judit-resetar-processo` e atualiza apenas o processo no estado local.

## Correção
Replicar em `useAllProcessosOAB.carregarDetalhes` o mesmo comportamento do `useOABs.carregarDetalhes`:
1. Invocar `supabase.functions.invoke('judit-resetar-processo', { body: { processoOabId, userId } })`.
2. Exibir toasts de feedback (carregando / sucesso / erro) via `sonner`, padrão já usado no `ProcessoOABDetalhes`.
3. Após o retorno, recarregar **apenas** o registro alterado em `processos_oab` e fazer merge no estado local — sem refetch global, mantendo o drawer aberto.
4. Tratar o caso `monitoramentoDesativado: true` retornado pela função (alertar o usuário para reativar o toggle).

## Arquivos afetados
- `src/hooks/useAllProcessosOAB.ts` — substituir o stub `carregarDetalhes` pela implementação real.

## Impacto
1. **UX**: Na aba **Geral** da Controladoria, o botão "Carregar Andamentos" passa a funcionar igual à aba de OAB individual — busca andamentos reais na Judit, com toast de progresso, sem fechar o drawer nem recarregar a página.
2. **Dados**: Nenhuma migration. Apenas dispara fluxo já existente (`judit-resetar-processo`) que insere andamentos em `processos_oab_andamentos` e atualiza `processos_oab`.
3. **Riscos colaterais**: A Edge Function pode pausar o monitoramento diário do processo na Judit (comportamento já documentado). O usuário precisa reativar o toggle manualmente — o toast vai avisar.
4. **Quem é afetado**: Todos os tenants. Especialmente útil para Vargas (TJRO), onde o usuário reportou o problema. Sem mudança em RLS, papéis ou rotas.

## Validação
- Abrir Controladoria → aba **Geral** em qualquer tenant.
- Abrir o drawer de um processo sem andamentos → clicar em "Carregar Andamentos".
- Verificar: toast "Carregando…" → toast de sucesso com contagem → andamentos aparecem na lista sem refresh da página.
- Verificar logs da função `judit-resetar-processo` para confirmar execução.
