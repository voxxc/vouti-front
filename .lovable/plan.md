

# Tornar Topbar e Sidebar interativos com o Planejador aberto

## Problema
O Planejador usa `Sheet` (Radix Dialog) que por padrão é **modal** — captura o foco e bloqueia cliques fora dele. Mesmo sem overlay (side="inset" já remove), o foco fica preso.

## Solução
Adicionar `modal={false}` ao componente `<Sheet>` do PlanejadorDrawer. Isso desativa o focus trap do Radix Dialog, permitindo interação com topbar e sidebar sem fechar o drawer.

### Arquivo: `src/components/Planejador/PlanejadorDrawer.tsx`
- Linha ~185: Alterar `<Sheet open={open} onOpenChange={...}>` para `<Sheet open={open} modal={false} onOpenChange={...}>`

Isso é suficiente — os handlers `onInteractOutside` e `onPointerDownOutside` com `e.preventDefault()` já estão no lugar para impedir o fechamento ao clicar fora.

