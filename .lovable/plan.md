

# Fix: Double-click na tarefa não deve fechar o drawer do Planejador

## Problema

O double-click no backdrop do TaskDetail fecha a tarefa (correto), mas o evento continua propagando pelo DOM e atinge o Sheet/Radix do Planejador, fechando o drawer também.

## Solução

**Arquivo:** `src/components/Planejador/PlanejadorTaskDetail.tsx` (linha 146)

No handler `onDoubleClick` do backdrop externo, chamar `e.stopPropagation()` antes de `onClose()` para impedir que o evento chegue ao drawer:

```tsx
onDoubleClick={(e) => { e.stopPropagation(); onClose(); }}
```

Uma mudança de 1 linha.

