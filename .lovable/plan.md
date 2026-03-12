

# Fix: Topbar desalinhada

## Problema
O header já está `fixed` mas o layout pode estar com padding/margin inconsistente. O `pt-[57px]` no main pode estar conflitando com o `py-4` que vem antes dele na mesma classe.

## Solução

**Arquivo: `src/components/Dashboard/DashboardLayout.tsx`**

1. **Main content (linha 340)**: Remover `py-4` e `md:py-8` duplicados que conflitam com `pt-[57px]`. Usar padding explícito:
   - `pt-[57px] pb-20 md:pb-8 px-3 md:px-6` — sem `py-*` que sobrescreve o `pt`

2. Manter o header como está: `fixed top-0 right-0 left-0 md:left-16 z-50`

Mudança mínima — apenas corrigir a classe do `<main>` para evitar conflito de padding.

