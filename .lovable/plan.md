## Fechar drawer ao duplo clique fora

### Problema
O drawer de detalhes do caso (`ProcessoOABDetalhes`) está com os handlers `onInteractOutside` e `onPointerDownOutside` setados para `e.preventDefault()`, impedindo o fechamento ao clicar fora. O usuário quer que o drawer feche **apenas ao dar duplo clique fora** dele, não no clique simples.

### Solução
Adicionar um listener de `dblclick` no documento (via `useEffect`) que verifica se o clique ocorreu fora do elemento `SheetContent`. Se sim, chama `onOpenChange(false)` para fechar o drawer.

### Detalhes técnicos
- Usar `useEffect` no componente `ProcessoOABDetalhes.tsx` para registrar/remover o listener de `dblclick`
- Usar `useRef` para obter a referência do elemento `SheetContent`
- No handler, usar `element.contains(event.target)` para verificar se o clique foi fora
- Garantir que o subdrawer lateral (`MovimentacaoDetalhe`) não seja afetado — o listener só deve fechar o drawer principal
- O listener só deve estar ativo quando `open === true`

### Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx`

### Validação
- Abrir um caso, dar duplo clique na área cinza (fora do drawer) → drawer deve fechar
- Dar um clique simples fora → drawer deve permanecer aberto
- Dar duplo clique dentro do drawer → drawer deve permanecer aberto