

# Fix: Botão Dashboard nem sempre fecha drawers

## Problema
O botão "Dashboard" na sidebar é apenas um `Button` que chama `onDrawerChange(null)`. Ele não navega para a rota do dashboard — apenas tenta fechar o drawer ativo. Em alguns casos (ex: estado stale, clique durante animação), o drawer pode não fechar corretamente.

## Solução
Transformar o botão Dashboard em um `Link` (como o logo já é) que **navega para a rota do dashboard E fecha o drawer ativo**. Isso garante que, ao clicar, o usuário sempre volta ao dashboard com drawers fechados.

### `src/components/Dashboard/DashboardSidebar.tsx`
- Trocar o `Button` do item "dashboard" (linhas 212-228) por um `Link to={dashboardPath}` com `onClick={handleDashboardClick}`, similar ao logo.
- Manter o estilo visual do botão usando `cn()`.

### `src/components/Dashboard/MobileBottomNav.tsx`
- No handler do tab "dashboard", além de chamar `onDashboardClick()`, garantir que o estado é limpo corretamente (já funciona via `setActiveDrawer(null)` no pai, mas vou adicionar navegação explícita como fallback).

## Arquivos
- `src/components/Dashboard/DashboardSidebar.tsx`

