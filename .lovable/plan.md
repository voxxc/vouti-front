## Problema

Em `ProjectProtocolosList.tsx`, os processos são arrastados para dentro de **carteiras** usando `@hello-pangea/dnd`. Quando uma carteira tem muitos processos, surgem dois problemas:

1. **Autoscroll quebrado**: o conteúdo está dentro de um `<ScrollArea>` (Radix). O `@hello-pangea/dnd` não detecta corretamente o viewport interno do Radix ScrollArea como container scrollável, então o autoscroll durante o drag não funciona — o usuário precisa dar zoom out para ver a carteira destino.
2. **Sem alternativa ao drag**: a única forma de mover um processo para uma carteira é arrastando, o que fica inviável em listas longas.

## Solução

### 1. Substituir `ScrollArea` pelo overflow nativo (corrige autoscroll)

No bloco da linha 501 (`<ScrollArea className="flex-1">`), trocar por:

```tsx
<div className="flex-1 overflow-y-auto" data-rfd-scroll-container>
```

O `@hello-pangea/dnd` detecta `overflow: auto` nativo e ativa o autoscroll automaticamente quando o cursor chega perto da borda. Isso resolve o problema de "ter que dar zoom out".

### 2. Adicionar ação "Mover para carteira" como alternativa ao drag

No `renderProtocoloItem` (linha 383), adicionar um pequeno botão de ícone `FolderInput`/`MoveRight` ao lado do `GripVertical`, que abre um `DropdownMenu` listando:
- Cada carteira existente (com a cor) → move para aquela carteira
- "Remover da carteira" (se já está em uma) → volta para a lista principal

Reaproveita os handlers existentes `handleMoverParaCarteira` e `handleRemoverDeCarteira`. Funciona com 1 clique, sem depender de drag.

### 3. Melhorias visuais durante o drag

- **Destaque do destino**: nas Droppables (linha 520 e 578), quando `snapshot.isDraggingOver` for true, aplicar fundo `bg-primary/5` e borda `border-primary/40 border-dashed` para feedback claro.
- **Auto-colapsar outras carteiras durante drag**: usar um state `isDragging` setado no `onDragStart` do `DragDropContext`. Quando ativo, forçar `open={false}` nos `Collapsible` das carteiras que não são origem nem destino atual — encurta a lista e facilita o drop. Ao soltar, restaura.
- **Cabeçalho da carteira como drop zone**: quando uma carteira está colapsada, ainda assim permitir drop no header dela (envolve o `CollapsibleTrigger` na própria `Droppable` ou usa um sub-droppable no header).

### 4. Cap visual de altura por carteira

Cada carteira passa a ter `max-h-[400px] overflow-y-auto` no container interno (linha 583). Mesmo "lotada", ocupa altura limitada e o usuário sempre vê a próxima carteira/lista. O autoscroll interno + autoscroll externo funcionam juntos.

## Arquivos afetados

- `src/components/Project/ProjectProtocolosList.tsx` — todas as mudanças acima

## Resultado

- Drag funciona suave mesmo com 100+ processos numa carteira (autoscroll)
- Quem preferir, usa o botão "Mover para carteira" e nem precisa arrastar
- Feedback visual claro de onde vai cair o item
- Carteiras lotadas não estouram a tela
