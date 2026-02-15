
## Enriquecer Indicadores do Financeiro

O painel financeiro atual tem apenas 4 cards simples (Projetos Ativos, Prazos Vencidos, Total de Prazos, Taxa de Adimplencia) e uma lista de vencidos. Falta muita informacao financeira relevante que ja existe no banco de dados.

### O que sera adicionado

**1. Novos KPIs (Cards de metricas)**
- **Receita do Mes**: soma dos valores pagos (`cliente_parcelas` com `data_pagamento` no mes atual)
- **A Receber (Pendente)**: soma de parcelas com status `pendente` ou `parcial`
- **Custos do Mes**: soma dos custos (`custos`) no mes atual
- **Folha de Pagamento**: soma dos pagamentos de colaboradores do mes (`colaborador_pagamentos`)
- **Inadimplencia**: quantidade de parcelas vencidas e nao pagas

**2. Grafico de Linha - Receitas vs Custos (ultimos 6 meses)**
- Linha verde: receitas recebidas por mes
- Linha vermelha: custos pagos por mes
- Eixo X: meses, Eixo Y: valores em R$
- Usa `recharts` (ja instalado) com `LineChart`

**3. Grafico de Barras - Parcelas por Status**
- Barras agrupadas mostrando pendentes, pagas, parciais e vencidas
- Visao rapida da saude financeira

**4. Grafico de Pizza - Custos por Categoria**
- Distribuicao dos custos por categoria (`custo_categorias`)
- Mostra onde o dinheiro esta sendo gasto

**5. Lista de Proximos Vencimentos**
- Parcelas que vencem nos proximos 7 dias
- Complementa a lista de vencidos que ja existe

---

### Detalhes Tecnicos

**Arquivo principal**: `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx`

**Dados consultados no useQuery existente (expandir a queryFn)**:
- `cliente_parcelas` - receitas, vencimentos, inadimplencia
- `custos` - despesas por mes e categoria
- `custo_categorias` - nomes das categorias
- `colaborador_pagamentos` - folha de pagamento

**Componentes de graficos (do recharts, ja instalado)**:
- `LineChart` + `Line` + `XAxis` + `YAxis` + `CartesianGrid` + `Tooltip` + `Legend` + `ResponsiveContainer`
- `BarChart` + `Bar`
- `PieChart` + `Pie` + `Cell`

**Estrutura do componente expandido**:
1. Saudacao (ja existe)
2. Grid de 5 KPI cards (expandir dos 4 atuais)
3. Card com grafico de linha (Receita vs Custos - 6 meses)
4. Grid 2 colunas: Grafico de barras (parcelas por status) + Pizza (custos por categoria)
5. Card com proximos vencimentos (novo) + lista de vencidos (ja existe)

**Organizacao**: Para manter o arquivo organizado, os graficos serao extraidos em subcomponentes dentro de `src/components/Dashboard/Metrics/Financeiro/`:
- `FinanceiroReceitaCustosChart.tsx` (grafico de linha)
- `FinanceiroParcelasStatusChart.tsx` (grafico de barras)
- `FinanceiroCustosCategoriaChart.tsx` (grafico de pizza)
- `FinanceiroProximosVencimentos.tsx` (lista)

O hook de dados permanece centralizado no `FinanceiroMetrics.tsx` e passa props para os subcomponentes.
