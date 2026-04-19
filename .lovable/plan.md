

## Continuação da Fase 4 — Sub-fases pendentes

Vou executar as sub-fases pendentes da Fase 4 na ordem recomendada do roadmap aprovado:

### Ordem de execução

1. **Fase 4.5 — Financeiro** (Drawer + Lista de clientes)
2. **Fase 4.4 — Agenda** (Calendário + Eventos)
3. **Fase 4.1 — Planejador** (Kanban + Chat)
4. **Fase 4.3 — CRM** (Inbox + Conversas + Tickets)
5. **Fase 4.6 — Polimento final** (Bot Workflow, Auth, Settings)

### Estratégia

Vou executar **uma sub-fase por vez**, com validação entre elas. Isso evita mudanças massivas e permite ajuste de rota se algo não ficar bom.

### Começando agora: **Fase 4.5 — Financeiro**

**O que vai mudar:**
- `FinancialDrawer.tsx`: header com `glass-surface` (consistente com sidebar/topbar), tipografia `apple-h1`/`apple-subtitle`.
- `FinancialContent.tsx`: lista de clientes com `apple-list-item`, badges de status como pílulas refinadas.
- `ClienteFinanceiroDialog.tsx`: cards de métricas estilo `kpi-card`, seções com `rounded-2xl`.
- `FinancialMetrics.tsx`: validar que herda visual da Fase 3 (charts já refinados).
- Empty state da lista com `apple-empty`.

**Exploração necessária:**
- Ler `FinancialContent.tsx`, `ClienteFinanceiroDialog.tsx`, `FinancialMetrics.tsx` pra mapear estrutura exata antes de aplicar refinamentos.

### Arquivos afetados (Fase 4.5)

- `src/components/Financial/FinancialDrawer.tsx`
- `src/components/Financial/FinancialContent.tsx`
- `src/components/Financial/ClienteFinanceiroDialog.tsx`
- `src/components/Financial/FinancialMetrics.tsx` (validação/ajustes finos)

### Impacto (Fase 4.5)

- **UX**: Financeiro fica visualmente coeso com Dashboard/Controladoria. Lista de clientes mais arejada, detalhes do cliente com hierarquia clara.
- **Dados**: zero mudanças.
- **Riscos**: mudanças isoladas no módulo Financeiro. Restrição de visibilidade admin-only (memory `client-financial-data-visibility`) mantida intacta — só refinamento visual.
- **Quem é afetado**: admins do sistema jurídico (únicos com acesso ao módulo Financeiro).

### Validação (após cada sub-fase)

1. Abrir o módulo refinado → confirmar visual.
2. Abrir 2-3 outros módulos não-tocados → garantir zero regressão.
3. Dark mode + viewport 390px.

### Próximas sub-fases

Depois de Fase 4.5 validada, sigo automaticamente pra **4.4 (Agenda)**, depois **4.1 (Planejador)**, **4.3 (CRM)** e **4.6 (Polimento)**. Você pode pausar a sequência a qualquer momento.

