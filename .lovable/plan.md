

# Fix: TaskDetail conflita com o Drawer do Planejador

## Problema

O `PlanejadorTaskDetail` é renderizado como `fixed inset-0 z-[70]` fora do `Sheet` (que usa Radix Portal). Isso causa conflito de stacking context — o backdrop do TaskDetail compete com o portal do Sheet, resultando em bugs visuais e de interação (cliques não funcionam, elementos ficam por baixo).

## Solução

Mover o `PlanejadorTaskDetail` para **dentro** de um **React Portal** próprio (`createPortal` para `document.body`), garantindo que ele fique no topo da árvore DOM, acima de qualquer outro portal (incluindo o do Sheet/Radix).

### Mudanças

**`PlanejadorTaskDetail.tsx`**
- Envolver o retorno em `createPortal(..., document.body)` para garantir que o overlay do task detail fique sempre acima do drawer
- Aumentar z-index para `z-[80]` por segurança
- Adicionar `pointer-events-auto` no container interno para garantir que cliques funcionem

**`PlanejadorDrawer.tsx`**
- Nenhuma mudança necessária — o TaskDetail já está fora do Sheet, mas agora com o portal ele será renderizado corretamente no body

Resultado: o TaskDetail sempre sobrepõe o drawer do Planejador sem conflitos.

