

## Ajustes no Dashboard Admin

### Causa raiz
1. Grid de 4 KPIs (Clientes / Casos / Processos / PrazosDistribution) está logo abaixo do painel de Prazos. Usuário quer mover para **depois** do bloco `ClienteAnalytics`.
2. Componente `ClienteAnalytics` exibe título "Analytics de Clientes" — usuário quer renomear para **"Indicadores de Clientes"**.

### Correção

**1. Reordenar `AdminMetrics.tsx`**
Sequência nova:
1. Header (saudação + toggle privacidade)
2. PrazosAbertosPanel (Minhas Tarefas e Prazos)
3. **ClienteAnalytics** (Indicadores de Clientes)
4. **Grid de 4 KPIs** (Clientes / Casos / Processos / PrazosDistribution) ← movido pra cá
5. ProcessosMetrics, TasksMetrics, ClienteTasksMetrics, OverviewSection, AgendaMetrics (mantém)

**2. Renomear título no `ClienteAnalytics.tsx`**
- Localizar string "Analytics de Clientes" (ou variações como "Analytics") e trocar para "Indicadores de Clientes".
- Vou ler o arquivo antes pra confirmar a string exata e se há subtítulo associado.

### Arquivos afetados
- `src/components/Dashboard/Metrics/AdminMetrics.tsx` (reordenação)
- `src/components/Dashboard/ClienteAnalytics.tsx` (renomear título)

### Impacto
- **UX**: fluxo de leitura passa a ser: prazos pessoais → indicadores de clientes (visão estratégica) → KPIs operacionais → demais métricas. Faz mais sentido hierárquico.
- **Dados**: zero. Só reordenação visual + label.
- **Performance**: nenhuma — mesmas queries, mesma ordem de execução (componentes React independentes).
- **Riscos colaterais**: nenhum. Componentes são autônomos com suas próprias queries.
- **Quem é afetado**: apenas admins em `/:tenant/dashboard`. Outras roles não usam `AdminMetrics`.

### Validação
1. `/solvenza/dashboard` (admin) → ordem: Prazos → Indicadores de Clientes → 4 KPIs → resto.
2. Título "Indicadores de Clientes" visível no lugar de "Analytics".
3. Dark mode + 390px → layout responsivo intacto.
4. Outras roles → sem alteração.

