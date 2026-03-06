

## Corrigir z-index do dropdown de Busca Rápida

### Problema

O dropdown de resultados do `CRMQuickSearch` usa `z-50`, que é o mesmo z-index do `SheetContent` (drawer do projeto). Como o drawer é renderizado depois no DOM, ele fica por cima do dropdown.

### Correção

**`src/components/WhatsApp/components/CRMQuickSearch.tsx`**

Aumentar o z-index do dropdown de resultados de `z-50` para `z-[100]`, garantindo que fique acima de qualquer Sheet/drawer aberto.

Linha 131:
```typescript
// De:
<div className="absolute top-full left-0 mt-1 w-64 z-50 bg-popover ...">

// Para:
<div className="absolute top-full left-0 mt-1 w-64 z-[100] bg-popover ...">
```

Apenas 1 linha alterada em 1 arquivo.

