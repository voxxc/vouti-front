

## Plano: Navegação por teclado na Busca Rápida do CRM

### Problema
O componente `CRMQuickSearch` usa um `<Input>` separado do `<Command>`, então as teclas de seta não navegam pelos resultados. O `cmdk` (Command) já tem navegação por teclado nativa, mas o input precisa estar integrado.

### Solução
Adicionar um estado `highlightedIndex` controlado manualmente via `onKeyDown` no input, com suporte a:
- **Seta para baixo**: avança o índice
- **Seta para cima**: volta o índice
- **Enter**: seleciona o item destacado
- **Escape**: fecha o dropdown

### Alteração (1 arquivo)

**`src/components/WhatsApp/components/CRMQuickSearch.tsx`**

1. Adicionar estado `highlightedIndex` (default: 0), resetado quando `searchTerm` muda
2. Adicionar `onKeyDown` no `<Input>` para ArrowDown, ArrowUp, Enter e Escape
3. Aplicar classe de destaque visual (`bg-accent`) no item com índice correspondente ao `highlightedIndex`
4. Trocar `<Command>/<CommandItem>` por `<div>` simples para evitar conflito de foco com o cmdk — o input mantém o foco enquanto as setas controlam o highlight

### Visual
- Item destacado terá `bg-accent text-accent-foreground` (mesmo visual do hover atual)
- O foco permanece no input durante toda a navegação

