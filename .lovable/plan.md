

## Plano: Módulos Financeiros Funcionais do VoTech

### Visão Geral
Criar 5 módulos financeiros completos (Receitas, Despesas, Contas a Pagar, Contas a Receber, Relatórios) com tabelas dedicadas no banco, hooks, componentes e navegação funcional no dashboard.

---

### 1. Banco de Dados (1 migração)

**Tabelas a criar:**

- **`votech_categorias`** — categorias reutilizáveis (receita/despesa)
  - `id`, `user_id`, `tipo` (receita/despesa), `nome`, `cor`, `icone`, `created_at`

- **`votech_transacoes`** — tabela central de receitas e despesas
  - `id`, `user_id`, `tipo` (receita/despesa), `descricao`, `valor`, `data`, `categoria_id` (FK), `forma_pagamento`, `status` (pago/pendente), `observacoes`, `recorrente`, `created_at`, `updated_at`

- **`votech_contas`** — contas a pagar e a receber
  - `id`, `user_id`, `tipo` (pagar/receber), `descricao`, `valor`, `data_vencimento`, `data_pagamento`, `status` (pendente/pago/atrasado), `categoria_id` (FK), `fornecedor_cliente`, `forma_pagamento`, `observacoes`, `created_at`, `updated_at`

**RLS**: Todas com `user_id = auth.uid()` (isolamento por usuário, sem tenant — plataforma pessoal/empresarial).

**Seed**: Inserir categorias padrão via função `criar_votech_categorias_padrao(user_id)`.

---

### 2. Tipos (`src/types/votech.ts`)
Adicionar interfaces: `VotechCategoria`, `VotechTransacao`, `VotechConta`.

---

### 3. Hooks (`src/hooks/votech/`)

- **`useVotechCategorias.ts`** — CRUD de categorias
- **`useVotechTransacoes.ts`** — CRUD de transações (receitas + despesas), filtros por tipo/período/categoria
- **`useVotechContas.ts`** — CRUD de contas a pagar/receber, filtros por tipo/status/período

---

### 4. Componentes (`src/components/Votech/`)

- **`VotechSidebar.tsx`** — sidebar extraída com navegação por estado (activeView)
- **`VotechDashboardView.tsx`** — view atual do dashboard com cards de resumo dinâmicos
- **`VotechTransacoesView.tsx`** — listagem + filtros + formulário modal para receitas OU despesas (prop `tipo`)
- **`VotechTransacaoForm.tsx`** — dialog de criar/editar transação
- **`VotechContasView.tsx`** — listagem de contas a pagar OU receber (prop `tipo`)
- **`VotechContaForm.tsx`** — dialog de criar/editar conta
- **`VotechRelatoriosView.tsx`** — resumo mensal com totais, gráfico de barras receita vs despesa (recharts)

---

### 5. Dashboard Refatorado (`VotechDashboard.tsx`)

Transformar em layout com sidebar + área de conteúdo controlada por `activeView`:
- `dashboard` → VotechDashboardView (cards com valores reais do banco)
- `receitas` → VotechTransacoesView tipo="receita"
- `despesas` → VotechTransacoesView tipo="despesa"
- `contas-pagar` → VotechContasView tipo="pagar"
- `contas-receber` → VotechContasView tipo="receber"
- `relatorios` → VotechRelatoriosView

---

### 6. Funcionalidades por módulo

**Receitas/Despesas:**
- Tabela com filtro por período, categoria, status
- Cards de resumo (total pago, total pendente)
- Criar/editar/excluir via modal
- Categorias com cores

**Contas a Pagar/Receber:**
- Listagem com badge de status (pendente/pago/atrasado)
- Marcar como pago com 1 clique
- Filtro por vencimento (vencidas, hoje, próximos 7 dias, mês)
- Alertas visuais para contas atrasadas

**Dashboard:**
- Cards com valores reais (soma de receitas, despesas, saldo, contas pendentes)
- Lista das últimas 5 transações
- Contas vencendo nos próximos 7 dias

**Relatórios:**
- Gráfico de barras mensal (receitas vs despesas) via recharts
- Tabela resumo por categoria
- Filtro por período

---

### Resumo de arquivos

**Criar (11 arquivos):**
- `supabase/migrations/xxx_create_votech_financeiro.sql`
- `src/hooks/votech/useVotechCategorias.ts`
- `src/hooks/votech/useVotechTransacoes.ts`
- `src/hooks/votech/useVotechContas.ts`
- `src/components/Votech/VotechSidebar.tsx`
- `src/components/Votech/VotechDashboardView.tsx`
- `src/components/Votech/VotechTransacoesView.tsx`
- `src/components/Votech/VotechTransacaoForm.tsx`
- `src/components/Votech/VotechContasView.tsx`
- `src/components/Votech/VotechContaForm.tsx`
- `src/components/Votech/VotechRelatoriosView.tsx`

**Editar (2 arquivos):**
- `src/types/votech.ts` — novos tipos
- `src/pages/VotechDashboard.tsx` — refatorar para usar sidebar + views

