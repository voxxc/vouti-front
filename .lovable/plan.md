

# Reduzir tamanho visual do "Processos por Tribunal"

## O que será feito

Reduzir a altura das barras de progresso de `h-2` para `h-1.5` (6px) no componente Progress do card de indicadores, tornando visual mais compacto e elegante.

## Alteração

**`src/components/Controladoria/ControladoriaIndicadores.tsx`**:
- Alterar `className="h-2"` para `className="h-1.5"` na linha 110 do Progress

