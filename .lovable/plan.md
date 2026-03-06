

## Corrigir z-index do dropdown de Busca Rápida

### Problema
O dropdown de resultados do `CRMQuickSearch` usa `z-50`, mesmo valor do `SheetContent` (drawer). O drawer é renderizado depois no DOM, então fica por cima.

### Correção

**`src/components/WhatsApp/components/CRMQuickSearch.tsx`** — linha 131

Alterar `z-50` para `z-[60]` no container do dropdown de resultados. Valor suficiente para sobrepor o Sheet (`z-50`) sem ser exagerado.

```
z-50  →  z-[60]
```

1 linha, 1 arquivo.

