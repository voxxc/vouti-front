

# Drawer de Projetos com Tamanho Menor

## Situacao Atual

O `ProjectsDrawer` usa `side="inset"` que ocupa praticamente toda a area de conteudo (da sidebar ate a borda direita).

## Solucao

Trocar de `side="inset"` para `side="left"` no ProjectsDrawer. A variante `left` ja existe no Sheet e cria um drawer lateral menor com largura maxima de `sm:max-w-sm` (384px).

### Comparacao Visual

```text
INSET (atual):                          LEFT (proposto):
                                        
┌──────┬──────────────────────┐         ┌──────┬──────────┬───────────┐
│      │                      │         │      │          │           │
│ SIDE │   DRAWER GRANDE      │         │ SIDE │ DRAWER   │  (vazio)  │
│ BAR  │                      │         │ BAR  │ PEQUENO  │           │
│      │                      │         │      │ ~380px   │           │
│      │                      │         │      │          │           │
└──────┴──────────────────────┘         └──────┴──────────┴───────────┘
```

## Arquivo a Modificar

**`src/components/Projects/ProjectsDrawer.tsx`** - linha 78

### Antes:
```tsx
<SheetContent side="inset" className="p-0 flex flex-col">
```

### Depois:
```tsx
<SheetContent side="left" className="p-0 flex flex-col w-80 sm:max-w-sm">
```

## Comportamento

| Aspecto | Resultado |
|---------|-----------|
| Largura | ~320px (w-80) ate max 384px |
| Posicao | Lado esquerdo da tela |
| Overlay | Com overlay escuro (padrao da variante left) |
| Animacao | Slide da esquerda |
| Sidebar | Fica coberta pelo drawer |

## Observacao

A variante `left` usa overlay escuro por padrao. Se preferir sem overlay (como o inset ajustado), posso criar uma variante customizada ou ajustar a logica.

