

# Fix: Planejador não aparece no preview

## Causa raiz

O `PlanejadorDrawer` usa `SheetContent` (baseado no Radix Dialog) sem incluir um `SheetTitle`. O Radix lança um erro de acessibilidade que, dependendo da versão, pode impedir a renderização do conteúdo. O erro aparece no console:

> `DialogContent requires a DialogTitle for the component to be accessible`

## Correção

**Arquivo:** `src/components/Planejador/PlanejadorDrawer.tsx`

Adicionar um `SheetTitle` com classe `sr-only` (visualmente oculto) logo dentro do `SheetContent`, igual ao padrão já usado em outros drawers do projeto (ex: `MobileBottomNav` usa `<SheetTitle className="sr-only">`).

```tsx
<SheetContent side="inset" ...>
  <SheetTitle className="sr-only">Planejador</SheetTitle>
  ...
</SheetContent>
```

Importar `SheetTitle` do `@/components/ui/sheet`.

Uma única linha adicionada. Nenhuma outra mudança necessária.

