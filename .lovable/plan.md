# ESC volta para lista antes de fechar drawer

## Causa raiz
No `PublicacoesDrawer.tsx`, quando o usuário abre o detalhe de uma publicação (`selectedPub`), o ESC fecha o drawer inteiro de uma vez. O comportamento esperado é "voltar uma etapa" — ESC primeiro fecha o detalhe (volta para a lista), e só um segundo ESC fecha o drawer.

## Correção
Interceptar o evento de fechamento do `Sheet` quando `selectedPub` está ativo:
- Adicionar `onEscapeKeyDown` (e `onPointerDownOutside`) no `SheetContent` da view de detalhe.
- Se houver `selectedPub`, chamar `e.preventDefault()` e executar `setSelectedPub(null)` em vez de propagar o fechamento.
- Quando não há `selectedPub`, ESC mantém o comportamento atual (fecha o drawer).

## Arquivos afetados
- `src/components/Publicacoes/PublicacoesDrawer.tsx`

## Impacto
1. **UX**: ESC vira atalho natural de "voltar". Usuário que abre uma publicação por engano sai rapidamente sem perder o contexto da lista (filtros, scroll).
2. **Dados**: Nenhum impacto em schema, RLS ou queries.
3. **Riscos**: Mínimos — mudança isolada no handler de ESC do drawer. Clique no X / clique fora continuam fechando normalmente.
4. **Quem é afetado**: Todos os usuários que utilizam o drawer de Publicações.

## Validação
- Abrir drawer de Publicações → abrir um item → pressionar ESC → deve voltar para a lista (drawer continua aberto).
- Pressionar ESC novamente na lista → drawer fecha.
- Confirmar que clicar fora ou no botão de fechar mantém o comportamento atual.
