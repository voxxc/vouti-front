

# Gráfico de Prazos Periciais com Toggle no Card

## Conceito
Adicionar ao card existente `PrazosDistributionChart` uma setinha discreta (ChevronRight/ChevronLeft) que alterna entre duas visões:
- **Vista 1 (atual)**: "Prazos" -- todos os prazos, filtros de período e usuário
- **Vista 2 (nova)**: "Prazos Periciais" -- apenas prazos de usuários com role `perito`, mesmos filtros de período e usuário (filtrado a peritos), mesma lógica de concluído/atrasado/pendente

Visibilidade: admin, controller, perito (verificado via role do usuário logado).

## Implementação

### 1. `src/components/Dashboard/PrazosDistributionChart.tsx`
- Adicionar estado `view: 'geral' | 'pericial'` com toggle via seta discreta no header
- Quando `view === 'pericial'`:
  - Buscar lista de user_ids com role `perito` (da query `get_users_with_roles`, filtrando `highest_role === 'perito'`)
  - Filtrar deadlines onde `user_id` ou `advogado_responsavel_id` pertence a um perito
  - Filtro de usuário mostra apenas peritos
  - Título muda para "Prazos Periciais"
  - Ícone muda (ex: `Scale` do lucide)
- Transição suave com CSS (`transition-opacity` ou slide)
- Seta: `ChevronRight` no canto direito do header, rotaciona ao alternar

### 2. Prop `userRole` no componente
- Receber o role do usuário logado via prop
- Só mostrar a seta de toggle se role for `admin`, `controller` ou `perito`
- Se role for `perito`, iniciar direto na vista pericial

### 3. `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` (e outros painéis que usam o chart)
- Passar a prop `userRole` para `PrazosDistributionChart`

### Sem mudanças no banco
A filtragem será feita client-side cruzando os user_ids dos peritos (já disponíveis via `get_users_with_roles`) com os deadlines. Não precisa de migration.

### Fluxo visual
```text
┌─────────────────────────────────┐
│ 🥧 Prazos · 1 mês · Todos  ➜  │  ← seta discreta
│                                 │
│       [Pie Chart Geral]        │
│   ● 5  ● 2  ● 8               │
└─────────────────────────────────┘
         ↓ clique na seta
┌─────────────────────────────────┐
│ ⚖ Prazos Periciais · 1 mês ←  │
│                                 │
│     [Pie Chart Pericial]       │
│   ● 3  ● 1  ● 4               │
└─────────────────────────────────┘
```

