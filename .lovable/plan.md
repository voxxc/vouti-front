

## Coluna "Sem prazo" como primeira posição no Planejador (para todos)

### Causa raiz

A ordem padrão das colunas do Kanban do Planejador está definida em `src/hooks/usePlanejadorTasks.ts` (`KANBAN_COLUMNS`), com `vencido` em primeiro e `sem_prazo` em penúltimo. Cada usuário/tenant pode reordenar via `PlanejadorSettings` e o resultado é salvo em `localStorage` com a chave `planejador-column-config-{tenantId}`. Para forçar a nova ordem "para todos" precisamos:
1. Alterar a ordem padrão no array `KANBAN_COLUMNS`.
2. Migrar configurações já salvas no localStorage (caso contrário, quem já abriu o Planejador continua vendo a ordem antiga).

### Correção

**1. Reordenar `KANBAN_COLUMNS`** em `src/hooks/usePlanejadorTasks.ts`:

```ts
export const KANBAN_COLUMNS = [
  { id: 'sem_prazo',      label: 'Sem prazo', color: '#9ca3af' },
  { id: 'vencido',        label: 'Vencido', color: '#ef4444' },
  { id: 'hoje',           label: 'Vencimento hoje', color: '#a3e635' },
  { id: 'esta_semana',    label: 'Vencimento esta semana', color: '#22d3ee' },
  { id: 'proxima_semana', label: 'Vencimento na próxima semana', color: '#60a5fa' },
  { id: 'duas_semanas',   label: 'Vencimento em duas semanas', color: '#3b82f6' },
  { id: 'concluido',      label: 'Concluído', color: '#4b5563' },
];
```

Isso atualiza automaticamente: novos usuários, função "Restaurar padrão" em `PlanejadorSettings`, fallback quando não há config salvo, e a `PlanejadorListView` (que usa `KANBAN_COLUMNS` para indexação).

**2. Migração de configs salvos** em `src/components/Planejador/PlanejadorDrawer.tsx`:

Acrescentar versionamento à chave do localStorage. Trocar:
```ts
const STORAGE_KEY_PREFIX = "planejador-column-config-";
```
por:
```ts
const STORAGE_KEY_PREFIX = "planejador-column-config-v2-";
```

Resultado: configs antigos (v1) ficam órfãos e o sistema cai no `getDefaultColumnConfig()`, que já reflete a nova ordem com "Sem prazo" em primeiro. Quem quiser reordenar de novo continua livre para fazê-lo — apenas o ponto de partida muda.

### Arquivos afetados

**Modificados:**
- `src/hooks/usePlanejadorTasks.ts` (linhas 37–45) — reordenar o array `KANBAN_COLUMNS` colocando `sem_prazo` em primeiro.
- `src/components/Planejador/PlanejadorDrawer.tsx` (linha 30) — bumpar `STORAGE_KEY_PREFIX` para `v2` para invalidar configs antigos.

**Sem mudanças:** lógica de `categorizeTask`, `PlanejadorKanban`, `PlanejadorListView`, `PlanejadorSettings`, banco/RLS, hooks de tarefas.

### Impacto

**Usuário final (UX):**
- Coluna "Sem prazo" passa a ser a 1ª posição do Kanban do Planejador para todos os usuários, em todos os tenants — independente de já terem mexido nas configurações antes.
- Tarefas sem data viram a primeira coisa a aparecer ao abrir o Planejador, dando visibilidade imediata ao backlog não datado.
- Quem havia personalizado a ordem das colunas perde a personalização (fica com o novo padrão). Pode reordenar novamente via Configurações se quiser.
- A função "Restaurar padrão" no painel de configurações também passa a colocar "Sem prazo" em primeiro.

**Dados:**
- Zero migração de banco. Apenas mudança visual + invalidação de chave do localStorage.
- Não afeta a lógica de categorização (`categorizeTask`) — tarefas continuam sendo classificadas exatamente da mesma forma.

**Riscos colaterais:**
- Configurações personalizadas anteriores são perdidas (efeito intencional para garantir que "todos" vejam a nova ordem). Se algum usuário reclamar, ele só precisa reabrir o painel "Configurações das colunas" e reordenar.

**Quem é afetado:**
- Todos os usuários do Planejador, em todos os tenants (jurídico e CRM).

### Validação

1. Abrir o Planejador em qualquer tenant → "Sem prazo" deve ser a primeira coluna da esquerda.
2. Em um tenant que já tinha config personalizado salvo (testar em `/demorais/crm`): o config antigo fica ignorado, ordem padrão nova é aplicada.
3. Painel "Configurações das colunas" → botão "Restaurar padrão" → ordem volta com "Sem prazo" em 1º.
4. Reordenar manualmente, fechar e reabrir o drawer → ordem personalizada é mantida (salva em `v2`).
5. View "Lista" do Planejador → agrupamento por coluna respeita a nova ordem.
6. Drag & drop entre colunas continua funcionando normalmente.

