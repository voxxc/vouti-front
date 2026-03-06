

## Plano: Gráfico de Pizza de Prazos no Dashboard (Admin + Controller)

### Resumo
Substituir o card "Leads no CRM" (Admin) e os cards "Tarefas Ativas" + "Taxa de Conclusão" (Controller) por um novo componente de gráfico de pizza mostrando distribuição de prazos (total, concluídos, atrasados, pendentes), com filtros de período e usuário.

### Novo Componente: `PrazosDistributionChart.tsx`

Componente reutilizável que:
- Busca `deadlines` do tenant com filtro de data e opcionalmente por usuário (via `user_id`, `advogado_responsavel_id` ou `deadline_tags`)
- Classifica prazos em: **Concluídos** (completed=true), **Atrasados** (date < hoje e completed=false), **Pendentes** (date >= hoje e completed=false)
- Renderiza `PieChart` do Recharts com as 3 categorias
- Filtros:
  - **Período**: Select com opções "7 dias", "15 dias", "1 mês", "2 meses"
  - **Usuário**: Select com lista de usuários do tenant (via `get_users_with_roles`) + opção "Todos"

### Alterações em `AdminMetrics.tsx`
- Remover o card "Leads no CRM" (linhas 219-229) e "Taxa de Conversão" (linhas 231-241)
- No lugar, inserir o `PrazosDistributionChart` ocupando as 2 colunas restantes (ou abaixo dos KPIs como card separado tipo `col-span-2`)
- Remover query de `leads_captacao` e `conversionRate` do `queryFn`

### Alterações em `AdvogadoMetrics.tsx` (usado pelo Controller)
- Remover os 2 cards: "Tarefas Ativas" (linhas 124-133) e "Taxa de Conclusão" (linhas 135-144)
- Mudar grid de 4 para 2 colunas nos KPIs
- Adicionar `PrazosDistributionChart` abaixo dos KPIs restantes
- Remover queries de `tasks` do `queryFn`

### Estrutura do componente

```text
┌─────────────────────────────────────────────┐
│ Distribuição de Prazos                      │
│ [Período ▼]  [Usuário ▼]                   │
│                                             │
│         ┌─────────┐                         │
│        /  Pie     \    ● Concluídos (verde) │
│       |  Chart     |   ● Atrasados (verm.)  │
│        \          /    ● Pendentes (azul)    │
│         └─────────┘                         │
└─────────────────────────────────────────────┘
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/Dashboard/PrazosDistributionChart.tsx` | Criar novo componente |
| `src/components/Dashboard/Metrics/AdminMetrics.tsx` | Remover cards Leads/Conversão, adicionar gráfico |
| `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` | Remover cards Tarefas/Conclusão, adicionar gráfico |

