
## Aplicar melhorias de indicadores no Drawer do Financeiro

As melhorias (graficos de linha, barras, pizza, proximos vencimentos e KPIs expandidos) foram aplicadas apenas no componente do Dashboard (`FinanceiroMetrics.tsx`). O componente usado no drawer do Financeiro (`FinancialMetrics.tsx`) permaneceu com a versao antiga.

### Solucao

Atualizar o `src/components/Financial/FinancialMetrics.tsx` para incluir os mesmos graficos e KPIs novos, reutilizando os subcomponentes ja criados.

### Detalhes Tecnicos

**Arquivo a modificar**: `src/components/Financial/FinancialMetrics.tsx`

**Mudancas**:
1. Expandir a consulta de dados (`loadMetrics`) para buscar tambem:
   - `custos` e `custo_categorias` (para grafico de pizza de custos por categoria)
   - `colaborador_pagamentos` (para KPI de folha de pagamento)
   - Dados historicos dos ultimos 6 meses (para grafico de linha receita vs custos)

2. Adicionar novos KPI cards:
   - Receita do Mes
   - A Receber (Pendente)
   - Custos do Mes
   - Folha de Pagamento
   - Inadimplencia

3. Adicionar os graficos ja criados como subcomponentes:
   - `FinanceiroReceitaCustosChart` (grafico de linha - receita vs custos 6 meses)
   - `FinanceiroParcelasStatusChart` (grafico de barras - parcelas por status)
   - `FinanceiroCustosCategoriaChart` (grafico de pizza - custos por categoria)
   - `FinanceiroProximosVencimentos` (lista de proximos vencimentos 7 dias)

4. Os subcomponentes em `src/components/Dashboard/Metrics/Financeiro/` ja existem e serao importados diretamente - nenhum componente novo precisa ser criado.

**Estrutura final do componente**:
- Botao Exportar (ja existe)
- Grid de KPI cards (expandidos com novos indicadores)
- Grafico de Linha: Receita vs Custos (6 meses)
- Grid 2 colunas: Barras (parcelas por status) + Pizza (custos por categoria)
- Proximos Vencimentos (7 dias)
- Graficos existentes (pizza status clientes + barras receita) permanecem
