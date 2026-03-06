

## Plano: Compactar gráfico de prazos na mesma linha dos cards

### Problema
O `PrazosDistributionChart` está renderizado fora do grid dos cards, ocupando uma linha inteira abaixo. O usuário quer que fique na mesma direção/linha dos outros cards.

### Solução

**AdminMetrics.tsx**
- Mover `<PrazosDistributionChart>` para dentro do grid existente (linha 135, `grid-cols-3`)
- Expandir o grid para `lg:grid-cols-4` para acomodar o gráfico como um 4o card

**AdvogadoMetrics.tsx**
- Mover `<PrazosDistributionChart>` para dentro do grid (linha 77, `grid-cols-2`)
- Expandir para `lg:grid-cols-3`

**PrazosDistributionChart.tsx**
- Compactar o layout: reduzir altura do pie chart de 200px para ~150px, raios menores
- Filtros empilhados verticalmente para caber num card estreito
- Legenda mais compacta com números inline
- Remover o estado vazio grande, usar texto menor

### Arquivos

| Arquivo | Ação |
|---------|------|
| `PrazosDistributionChart.tsx` | Compactar layout para caber num card |
| `AdminMetrics.tsx` | Mover chart para dentro do grid |
| `AdvogadoMetrics.tsx` | Mover chart para dentro do grid |

