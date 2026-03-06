

## Plano: Melhorar layout dos filtros e tooltip do gráfico de Prazos

### Mudanças em `PrazosDistributionChart.tsx`

**1. Mover filtros para o header, ao lado do título "Prazos"**
- Remover os Selects do `CardContent` e colocá-los no `CardHeader`, ao lado do título
- Usar Popovers ou Selects compactos sem borda (variant ghost/link), mostrando apenas o texto clicável (ex: "1 mês" e "Todos") sem o botão com setinha
- Layout do header: `[icon] Prazos · 1 mês · Todos` onde "1 mês" e "Todos" são clicáveis e abrem o dropdown

**2. Corrigir tooltip no modo escuro**
- Adicionar `color: "hsl(var(--card-foreground))"` no `contentStyle` do Tooltip para que o texto fique visível no dark mode

### Arquivos

| Arquivo | Ação |
|---------|------|
| `PrazosDistributionChart.tsx` | Reorganizar header + fix tooltip |

