

# Fix: Double-click no fundo fecha a tarefa do Planejador

## Problema
No padrão do Vouti, double-click no overlay/fundo fecha o modal (vide `dialog.tsx` que despacha Escape no `onDoubleClick`). O `PlanejadorTaskDetail` usa um portal customizado sem esse comportamento.

## Solução

**Arquivo:** `src/components/Planejador/PlanejadorTaskDetail.tsx`

Adicionar `onDoubleClick={onClose}` no `div` externo (backdrop `fixed inset-0 z-[80]`), e garantir que o conteúdo interno tenha `e.stopPropagation()` no `onDoubleClick` para não fechar ao double-click dentro do painel.

```tsx
<div className="fixed inset-0 z-[80] ..." onDoubleClick={onClose}>
  <div className="flex w-full ..." onDoubleClick={(e) => e.stopPropagation()}>
    ...
  </div>
</div>
```

Uma mudança de 2 linhas. Segue o mesmo padrão do `DialogOverlay` do projeto.

