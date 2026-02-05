

# Remover Overlay Escuro dos Drawers Inset

## Problema

O `SheetOverlay` cobre toda a tela com fundo escuro (`bg-black/80`), incluindo a sidebar e o header. Isso cria um visual estranho porque essas áreas ficam escurecidas desnecessariamente.

## Solução

Para a variante `inset`, o SheetContent não deve renderizar o overlay escuro. Em vez disso, usaremos apenas uma borda sutil ou nenhum overlay.

### Arquivo: `src/components/ui/sheet.tsx`

Modificar o `SheetContent` para:
1. Aceitar uma prop `hideOverlay` ou detectar automaticamente quando `side="inset"`
2. Não renderizar o `SheetOverlay` quando for a variante inset

### Código Proposto

```typescript
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>, 
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    {/* Só mostra overlay se NÃO for a variante inset */}
    {side !== "inset" && <SheetOverlay />}
    <SheetPrimitive.Content 
      ref={ref} 
      className={cn(sheetVariants({ side }), className)} 
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 ...">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
```

## Resultado Visual

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        BARRA SUPERIOR (normal, sem escurecer)                      │
├──────────┬────────────────────────────────────────────────────────────────────────┤
│          │                                                                    [X] │
│ SIDEBAR  │                    DRAWER INSET                                        │
│ (normal) │                                                                        │
│          │     Conteudo da pagina                                                 │
│          │                                                                        │
│          │     - Sem overlay escuro por trás                                      │
│          │     - Sidebar e header permanecem visíveis e claros                    │
│          │                                                                        │
└──────────┴────────────────────────────────────────────────────────────────────────┘
```

## Comportamento

- Sidebar e header ficam **totalmente visíveis** (sem escurecimento)
- Drawer aparece com animação suave da esquerda
- Clicar no X fecha o drawer
- Para fechar clicando fora: o usuário pode clicar na sidebar ou usar ESC

