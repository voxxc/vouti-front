

# Fix: Planejador só fecha com X ou ESC

## Problema

O Sheet do Planejador fecha ao clicar/interagir fora dele (comportamento padrão do Radix). Quando o usuário interage com tarefas (TaskDetail portal, etc.), eventos podem propagar e fechar o drawer acidentalmente.

## Solução

Adicionar `onInteractOutside` e `onPointerDownOutside` no `SheetContent` do `PlanejadorDrawer.tsx` para prevenir fechamento por interação externa — mesmo padrão já usado no `ProjectDrawer.tsx`.

**Arquivo:** `src/components/Planejador/PlanejadorDrawer.tsx` (linhas 129-134)

Adicionar dois handlers ao `SheetContent`:

```tsx
<SheetContent 
  side="inset" 
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
  className={...}
>
```

O drawer continuará fechando normalmente via botão X (já presente via `onOpenChange`) e tecla ESC (comportamento nativo do Radix Sheet).

Uma mudança de 2 linhas em 1 arquivo.

