## Causa raiz

Em `ProcessoOABDetalhes.tsx` o subdrawer (detalhe da movimentação) é um segundo `<Sheet>` aninhado dentro do `<Sheet>` principal. O Sheet principal é modal (padrão do Radix Dialog), então:

- Qualquer clique fora do `SheetContent` principal — inclusive dentro do subdrawer — é interpretado como "clique fora" e dispara `onOpenChange(false)`, fechando o drawer principal (e, em cascata, o subdrawer).
- O subdrawer atualmente usa `side="left"` no `SheetContent`, o que faz ele aparecer colado na **borda esquerda da tela**, e não saindo de dentro do drawer principal.

## Correção

1. **Impedir o fechamento em cascata:** adicionar `onInteractOutside`/`onPointerDownOutside` com `e.preventDefault()` no `SheetContent` do drawer principal (mesmo padrão do `ReunioesDrawer.tsx`). Assim, cliques dentro do subdrawer não fecham mais o drawer principal. O fechamento continua disponível via tecla ESC e via botão X nativo do Sheet.

2. **Fazer o subdrawer "sair" do drawer principal:** substituir o segundo `<Sheet side="left">` por um painel posicionado de forma absoluta, **encostado na borda esquerda do drawer principal** e expandindo para a esquerda. Implementação:
   - Trocar o `<Sheet>` interno por um `<div>` posicionado com `absolute right-full top-0 h-full w-[min(36rem,calc(100vw-36rem))]` dentro do `SheetContent` principal (que vira `relative`), com animação `slide-in-from-right` (visualmente desliza para a esquerda saindo da borda do drawer principal).
   - Manter o conteúdo `<MovimentacaoDetalhe ... />` como hoje, apenas embrulhado nesse novo container.
   - Adicionar `overflow-visible` no `SheetContent` principal para o painel transbordar para fora dele.
   - Renderização condicional baseada em `movimentacaoSelecionada`.
   - Fechar via botão X interno do `MovimentacaoDetalhe` (já existe `onClose`) e via tecla ESC (listener no container).

3. **Acessibilidade:** preservar foco visível no painel; usar `role="dialog"` e `aria-label="Detalhe da movimentação"` no container, já que ele deixa de ser um Radix Dialog.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx`
  - Adicionar props `onInteractOutside` e `onPointerDownOutside` no `SheetContent` principal.
  - Adicionar `relative overflow-visible` no `SheetContent` principal.
  - Remover o segundo `<Sheet>` interno (linhas ~1479–1509).
  - Inserir um `<div>` `absolute right-full` com `MovimentacaoDetalhe` dentro do `SheetContent` principal, com transição CSS.

Nenhuma alteração em hooks, dados, RLS, edge functions ou tipos.

## Impacto

1. **Usuário final (UX):** ao clicar em um andamento ou intimação, o painel de detalhe agora desliza para a esquerda **a partir da borda esquerda do drawer principal** (visual de "drawer dentro do drawer"), em vez de surgir colado na borda da tela. Interagir com esse painel não fecha mais nada. O drawer principal continua fechando por ESC ou pelo X.
2. **Dados:** nenhuma alteração — sem migration, sem mudança em RLS, sem impacto de performance.
3. **Riscos colaterais:** 
   - O drawer principal deixa de fechar ao clicar no overlay escuro — mudança de comportamento intencional, alinhada ao padrão já em uso no `ReunioesDrawer`. 
   - Em viewports muito estreitos (<900px) o painel lateral pode invadir a área visível; a largura é calculada com `min()` para evitar overflow horizontal.
4. **Quem é afetado:** todos os usuários que abrem detalhes de caso na Controladoria (admin, controller, advogado, estagiário, perito) em todos os tenants. Mudança puramente de UI/UX.

## Validação

1. No tenant `demorais`, abrir um caso → aba Andamentos → clicar em uma movimentação. Confirmar que o painel desliza saindo da borda esquerda do drawer (não da tela).
2. Interagir com o painel (rolar lista de anexos, clicar em "Visualizar", expandir preview). Confirmar que nada fecha.
3. Clicar no X do painel → painel fecha, drawer principal continua aberto.
4. Pressionar ESC com o painel aberto → fecha apenas o painel; pressionar ESC novamente → fecha o drawer principal.
5. Repetir o teste na aba Intimações.
6. Conferir console: sem warnings de Radix sobre foco ou descrição faltando.
