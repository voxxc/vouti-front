

# Fix: Tarefa não interativa + ESC fecha drawer ao invés da tarefa

## Problemas identificados

1. **Tarefa não interativa**: O portal da tarefa renderiza um overlay com `pointer-events-auto`, mas o conteúdo interno (inputs, botões, scroll) pode estar sendo bloqueado pelo overlay backdrop ou por conflito de z-index com o Sheet.

2. **ESC fecha o drawer em vez da tarefa**: O Sheet (Radix Dialog) captura o evento `keydown` ESC antes do portal da tarefa, pois o Sheet tem handler nativo de ESC. A tarefa é renderizada via `createPortal` fora do contexto do Sheet, mas o Sheet ainda escuta ESC globalmente.

## Solução

### 1. ESC fecha a tarefa primeiro (PlanejadorDrawer.tsx)

No `Sheet` do PlanejadorDrawer, interceptar `onOpenChange` para verificar se há uma tarefa aberta. Se houver, fechar a tarefa primeiro e não fechar o drawer:

```tsx
<Sheet 
  open={open} 
  onOpenChange={(newOpen) => {
    if (!newOpen && selectedTask) {
      setSelectedTask(null); // fecha a tarefa, não o drawer
      return;
    }
    onOpenChange(newOpen);
  }}
>
```

Adicionalmente, adicionar um `useEffect` com listener de `keydown` para ESC no `PlanejadorTaskDetail`, chamando `onClose()` e parando propagação.

### 2. Fix interatividade (PlanejadorTaskDetail.tsx)

O overlay `div` com `onDoubleClick` pode estar capturando eventos de click. Garantir que o conteúdo interno tenha `pointer-events-auto` explícito e que o overlay não bloqueie interações:

- Adicionar `onClick={(e) => e.stopPropagation()}` no container interno
- Garantir que inputs/buttons dentro do painel tenham interação correta
- Verificar se o z-index do portal (z-[80]) está acima do Sheet (z-50)

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `PlanejadorDrawer.tsx` | Interceptar `onOpenChange` para fechar tarefa antes do drawer |
| `PlanejadorTaskDetail.tsx` | Adicionar ESC listener + fix pointer-events no container |

