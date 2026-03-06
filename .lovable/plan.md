

## Corrigir dropdown da Busca Rápida ficando atrás do drawer

### Problema raiz

O componente que aparece no screenshot é o `ProjectQuickSearch` (no header), não o `CRMQuickSearch`. O header tem `z-30`, e o dropdown de resultados está posicionado dentro dele com `z-50`. Porém, o Sheet (drawer) é renderizado via Portal diretamente no body com `z-50`. Como o dropdown está dentro do contexto de empilhamento do header (`z-30`), seu z-index efetivo nunca ultrapassa 30 — ficando atrás do drawer.

### Solução

Renderizar o dropdown de resultados do `ProjectQuickSearch` usando um **Portal** (via React `createPortal`), posicionando-o diretamente no body. Assim ele escapa do stacking context do header e o `z-[60]` funciona de verdade.

### Alterações

**`src/components/Search/ProjectQuickSearch.tsx`**

1. Importar `createPortal` de `react-dom`
2. Calcular a posição do dropdown com base no `getBoundingClientRect()` do input
3. Renderizar o dropdown via `createPortal(…, document.body)` com posição `fixed` e `z-[60]`

```tsx
// Adicionar state para posição
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

// Ao abrir, calcular posição do input
useEffect(() => {
  if (open && inputRef.current) {
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
  }
}, [open, searchTerm]);

// Renderizar dropdown via portal
{open && filteredProjects.length > 0 && createPortal(
  <div
    ref={dropdownRef}
    className="fixed w-64 z-[60] bg-popover border border-border rounded-md shadow-lg"
    style={{ top: dropdownPos.top, left: dropdownPos.left }}
  >
    <Command>…</Command>
  </div>,
  document.body
)}
```

4. Atualizar o click-outside handler para incluir o `dropdownRef`

Mesma correção deve ser aplicada ao `CRMQuickSearch` se sofrer do mesmo problema.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/Search/ProjectQuickSearch.tsx` | Renderizar dropdown via Portal com posição fixed |

