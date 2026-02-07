
# Corrigir Dropdown da Busca Rapida Aparecendo Atras dos Drawers

## Problema

O dropdown de resultados da busca rapida aparece por baixo dos drawers abertos, mesmo com z-index alto (z-60).

## Causa Raiz

O problema e um **stacking context** do CSS:

```text
+-- Header (z-30) <-- Cria contexto de empilhamento
|   +-- ProjectQuickSearch
|       +-- Dropdown (z-60) <-- Limitado pelo z-30 do pai!
|
+-- Drawer (z-50 via Portal) <-- Fora do header, z-50 global
```

Quando um elemento pai cria um stacking context (com z-index definido), todos os filhos ficam limitados a esse contexto. O dropdown com `z-[60]` esta dentro do header `z-30`, entao na pratica ele vale `30 + 60` dentro do contexto, mas nao supera o z-50 global do drawer que esta fora.

## Solucao

Usar um **Portal** do React para renderizar o dropdown de resultados **fora** da arvore DOM do header, permitindo que o z-index funcione globalmente.

## Mudancas no Codigo

### Arquivo: `src/components/Search/ProjectQuickSearch.tsx`

**Adicionar imports:**
```tsx
import { createPortal } from 'react-dom';
```

**Adicionar estado para posicao do dropdown:**
```tsx
const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
```

**Calcular posicao quando abre:**
```tsx
useEffect(() => {
  if (open && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left
    });
  }
}, [open, searchTerm]);
```

**Renderizar dropdown via Portal:**
```tsx
{open && filteredProjects.length > 0 && createPortal(
  <div 
    className="fixed w-64 z-[100] bg-popover border border-border rounded-md shadow-lg"
    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
  >
    <Command>
      ...
    </Command>
  </div>,
  document.body
)}
```

## Comportamento Apos a Mudanca

| Cenario | Antes | Depois |
|---------|-------|--------|
| Drawer fechado | Dropdown visivel | Dropdown visivel |
| Drawer aberto | Dropdown atras | Dropdown na frente |
| Scroll da pagina | N/A | Dropdown segue posicao |

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Search/ProjectQuickSearch.tsx` | Usar Portal para renderizar dropdown fora do header |
