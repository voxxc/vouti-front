

# Planejador: Funcionalidades completas dos botões + Filtros na TopBar

## Resumo

Tornar funcionais os 4 botões laterais da tarefa (Subtarefas, Arquivos, Participantes, Marcadores), e adicionar filtros por usuário e marcadores na barra superior do Planejador, inspirado no print de referência.

---

## 1. Schema — 4 novas tabelas

### `planejador_task_subtasks`
- `id`, `task_id` (FK planejador_tasks), `titulo`, `prazo` (timestamptz), `concluida` (boolean default false), `user_id`, `tenant_id`, `created_at`, `updated_at`
- RLS: tenant_id = get_user_tenant_id()

### `planejador_task_files`
- `id`, `task_id` (FK), `file_name`, `file_url`, `file_size` (bigint), `file_type`, `uploaded_by`, `tenant_id`, `created_at`
- Upload reutiliza o bucket `planejador-chat-files` (já existe e é público)
- RLS: tenant_id = get_user_tenant_id()

### `planejador_task_participants`
- `id`, `task_id` (FK), `user_id`, `added_by`, `tenant_id`, `created_at`
- UNIQUE(task_id, user_id)
- RLS: tenant_id = get_user_tenant_id()

### `planejador_task_labels`
- `id`, `tenant_id`, `name`, `color`, `created_by`, `created_at`
- RLS: tenant_id = get_user_tenant_id()

### `planejador_task_label_assignments`
- `id`, `task_id` (FK), `label_id` (FK planejador_task_labels), `tenant_id`, `created_at`
- UNIQUE(task_id, label_id)
- RLS: tenant_id = get_user_tenant_id()

---

## 2. Componentes de cada funcionalidade

### Subtarefas (dentro do TaskDetail)
- Ao clicar "Subtarefas", expande uma seção inline (accordion) no painel esquerdo
- Input para adicionar subtarefa com título + prazo opcional
- Lista com checkbox para marcar concluída, badge de prazo, botão excluir
- Contador de concluídas/total exibido no botão

### Arquivos (dentro do TaskDetail)
- Ao clicar "Arquivos", expande seção inline
- Botão de upload (input file), upload para `planejador-chat-files/{taskId}/`
- Lista com nome, tamanho, ícone por tipo, botão download (abre URL) e excluir
- Contador no botão

### Participantes (Dialog)
- Ao clicar "Participantes", abre um Dialog
- Lista de membros do tenant (busca profiles) com checkbox para adicionar/remover
- Participantes adicionados definem quem pode ver a tarefa
- Proprietário sempre visível

### Marcadores (dentro do TaskDetail)
- Ao clicar "Marcadores", expande seção inline
- Lista de marcadores existentes do tenant (com cores) para selecionar
- Input para criar novo marcador (nome + cor)
- Marcadores atribuídos aparecem como badges no card do Kanban

---

## 3. Filtros na TopBar (ao lado do botão Criar)

Inspirado no print: dois dropdowns ao lado do botão "+ Criar":

1. **Filtro por usuário** — Dropdown "Todas as funções" → lista profiles do tenant → filtra tarefas onde o usuário é proprietário ou responsável ou participante
2. **Filtro por marcador** — Chips com marcadores ativos, com "×" para remover, campo de busca para adicionar

O estado dos filtros (`selectedUserId`, `selectedLabelIds`) fica no `PlanejadorDrawer` e é passado para o `PlanejadorKanban` que filtra as tarefas antes de renderizar.

A query de tasks no hook `usePlanejadorTasks` passa a fazer join com `planejador_task_label_assignments` para poder filtrar no frontend.

---

## 4. Exibir marcadores nos cards

`PlanejadorTaskCard` recebe lista de labels da tarefa e exibe como pequenas pills coloridas abaixo do título.

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | 5 tabelas + RLS policies |
| `PlanejadorTaskDetail.tsx` | Substituir botões estáticos por seções expansíveis funcionais (subtarefas, arquivos, marcadores) + Dialog participantes |
| `PlanejadorTopBar.tsx` | Adicionar dropdowns de filtro por usuário e por marcador ao lado do botão Criar |
| `PlanejadorDrawer.tsx` | Gerenciar estado dos filtros e passá-los ao Kanban |
| `PlanejadorKanban.tsx` | Receber filtros e aplicar na renderização |
| `PlanejadorTaskCard.tsx` | Exibir badges de marcadores |
| `usePlanejadorTasks.ts` | Fetch labels assignments junto com tasks |

