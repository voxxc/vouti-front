

# Subtarefas como cards no Kanban

## Conceito

Subtarefas criadas dentro de uma tarefa passam a aparecer também como cards independentes nas colunas do Kanban, com um ícone de bandeira (`Flag`) indicando visualmente que são subtarefas. Ao abrir uma subtarefa, a aba Info mostra de qual tarefa-pai ela pertence, com link para navegar até a tarefa-pai.

## Implementação

### 1. Estender o tipo `PlanejadorTask` (usePlanejadorTasks.ts)

Adicionar campos opcionais ao interface:
```ts
is_subtask?: boolean;
parent_task_id?: string;
parent_task_titulo?: string;
```

### 2. Buscar subtarefas e mesclar no Kanban (usePlanejadorTasks.ts)

No `tasksQuery`, após buscar as tasks normais, fazer uma segunda query em `planejador_task_subtasks` (mesmo tenant). Mapear cada subtask para o formato `PlanejadorTask`:
- `id` = subtask.id
- `titulo` = subtask.titulo
- `prazo` = subtask.prazo
- `status` = subtask.concluida ? 'completed' : 'pending'
- `proprietario_id` = subtask.user_id
- `is_subtask` = true
- `parent_task_id` = subtask.task_id
- `parent_task_titulo` = nome da tarefa-pai (join ou lookup local)
- campos ausentes (`descricao`, `responsavel_id`, etc.) = null/defaults

Concatenar as subtarefas convertidas com as tasks normais antes de categorizar nas colunas.

### 3. Ícone de bandeira no card (PlanejadorTaskCard.tsx)

Se `task.is_subtask === true`, exibir ícone `Flag` (laranja) ao lado do título, indicando visualmente que é uma subtarefa.

### 4. Info da tarefa-pai no detalhe (PlanejadorTaskDetail.tsx)

Na aba **Info**, se a tarefa aberta for subtarefa:
- Exibir seção "Subtarefa de: [Nome da tarefa-pai]"
- Nome da tarefa-pai clicável, que navega para abrir a tarefa-pai no detalhe

### 5. Evitar duplicação visual

Na seção de subtarefas dentro do detalhe de uma tarefa-pai, as subtarefas continuam listadas normalmente (checklist). Não há conflito — elas apenas também aparecem como cards no Kanban.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePlanejadorTasks.ts` | Estender interface, buscar subtasks, mesclar no resultado |
| `src/components/Planejador/PlanejadorTaskCard.tsx` | Ícone Flag para subtarefas |
| `src/components/Planejador/PlanejadorTaskDetail.tsx` | Seção "Subtarefa de" na aba Info |
| `src/components/Planejador/PlanejadorDrawer.tsx` | Suportar navegação tarefa-pai ao clicar no link |

