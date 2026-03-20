
# Fix: Planejador modo claro — textos e elementos invisíveis

## Problema

Todos os textos e ícones no TopBar e Kanban estão hardcoded com `text-white`, `text-white/50`, `bg-white/10`, etc. No modo claro com fundo luminoso, isso fica ilegível ou feio.

## Solução

Usar o `useTheme` para alternar as cores de texto e fundos em 3 arquivos:

### 1. `PlanejadorTopBar.tsx`
- Importar `useTheme`
- Substituir todas as classes `text-white` por condicionais:
  - Dark: `text-white`, `text-white/50`, `bg-white/10`, `border-white/10`
  - Light: `text-foreground`, `text-foreground/50`, `bg-black/5`, `border-black/10`
- Aplicar em: título, ícones, botões, input de pesquisa, tabs, bordas

### 2. `PlanejadorKanban.tsx`
- Importar `useTheme`
- Column headers: `text-white` → condicional `text-foreground` no light
- Column body: `bg-white/[0.03]` → `bg-black/[0.03]` no light
- Drag over: `bg-white/10 ring-white/20` → `bg-black/5 ring-black/10` no light
- Empty state: `text-white/20` → `text-foreground/20` no light
- Counter: `text-white/40` → `text-foreground/40` no light

### 3. `PlanejadorDrawer.tsx`
- Loader spinner: `text-white/50` → condicional no light

3 arquivos, apenas mudanças de classes CSS condicionais por tema.
