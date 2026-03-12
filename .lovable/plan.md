

# Fix: Topbar fixa sem sobrepor o sidebar

## Problema
O header com `fixed left-0 md:left-16` está sobrepondo a logo do sidebar porque tem `z-50` (acima do sidebar `z-40`). Além disso, quando o sidebar está expandido (`w-56`), o `md:left-16` não acompanha.

## Solução
Voltar para `sticky top-0` mas garantir que funcione adicionando `overflow-y-auto` no container pai. O `sticky` funciona quando o elemento pai tem overflow scrollável — o problema original era que o pai não tinha `overflow-y-auto`.

### Arquivo: `src/components/Dashboard/DashboardLayout.tsx`

1. **Container pai** (linha 275): Trocar `min-h-screen` por `h-screen overflow-y-auto`
   - `flex-1 flex flex-col h-screen min-w-0 overflow-y-auto`

2. **Header** (linha 277): Voltar para `sticky top-0 z-30`
   - `sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80`
   - Remove `fixed`, `left-0`, `right-0`, `md:left-16`

3. **Main content** (linha 340): Remover `pt-[57px]` — não é mais necessário com sticky
   - Voltar padding normal: `px-3 md:px-6 pb-20 md:pb-8 py-4 md:py-8`

Resultado: header fica dentro do fluxo do conteúdo, fixa ao topo ao rolar, sem sobrepor o sidebar.

