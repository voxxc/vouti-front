

# Fix: Topbar fixa ao rolar

## Problema
O `sticky top-0` não está funcionando corretamente — provavelmente o container pai com `flex-col min-h-screen` está interferindo no comportamento do sticky.

## Solução
Trocar de `sticky` para `fixed` positioning no header, e adicionar `pt-[49px]` no conteúdo abaixo para compensar o espaço ocupado.

### Arquivo: `src/components/Dashboard/DashboardLayout.tsx`

1. **Header**: Mudar de `sticky top-0` para `fixed top-0 right-0 left-0 md:left-16` (respeitando o sidebar de 64px no desktop)
2. **Main content**: Adicionar `pt-[49px]` para compensar a altura fixa do header
3. Aumentar z-index para `z-50` garantindo que fique acima de tudo

