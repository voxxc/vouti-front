

## Ajustes no Dashboard Admin

### Causa raiz
1. Bloco `<ProcessosMetrics />` ("CONTROLADORIA - PROCESSOS") está poluindo o dashboard admin — usuário quer remover.
2. Reordenação anterior moveu o grid de KPIs (Clientes/Casos/Processos/Prazos) para **abaixo** de `ClienteAnalytics`, perdendo o título "Indicadores" que ficava acima — usuário quer o título de volta sobre os 4 cards.

### Correção (`AdminMetrics.tsx`)

**1. Remover `<ProcessosMetrics />`**
- Excluir a linha `<ProcessosMetrics />` e o import correspondente.

**2. Adicionar título "Indicadores" acima do grid de 4 KPIs**
- Inserir bloco de cabeçalho antes do `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">`:
  ```tsx
  <div>
    <h2 className="apple-h1 mb-1">Indicadores</h2>
    <p className="apple-subtitle">Visão geral do escritório</p>
  </div>
  ```

### Sequência final
1. Header (saudação + toggle privacidade)
2. PrazosAbertosPanel
3. ClienteAnalytics ("Indicadores de Clientes")
4. **Indicadores** (novo título) + Grid de 4 KPIs
5. TasksMetrics, ClienteTasksMetrics, OverviewSection, AgendaMetrics

### Arquivos afetados
- `src/components/Dashboard/Metrics/AdminMetrics.tsx`

### Impacto
- **UX**: dashboard mais enxuto, hierarquia clara (Indicadores de Clientes → Indicadores gerais → tarefas → reuniões).
- **Dados**: zero. `ProcessosMetrics` continua existindo no codebase — apenas não é renderizado aqui (pode ser usado em outras páginas se necessário no futuro).
- **Performance**: melhora marginal (menos uma query de processos na home admin).
- **Riscos colaterais**: nenhum. Componente é autônomo.
- **Quem é afetado**: apenas admins em `/:tenant/dashboard`.

### Validação
1. `/solvenza/dashboard` → bloco "CONTROLADORIA - PROCESSOS" sumiu.
2. Título "Indicadores" visível acima dos 4 cards (Clientes/Casos/Processos/Prazos).
3. Demais seções intactas.

