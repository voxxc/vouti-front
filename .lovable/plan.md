

# Auditoria e melhoria das Tarefas Administrativas no Dashboard

## Problemas identificados

1. **Sem filtro de conclusão**: A query `fetchTarefasAdmin` busca **todas** as `task_tarefas` do usuário, incluindo tarefas que pertencem a cards já concluídos (status `done`). Isso pode fazer tarefas "sumirem" se o card foi movido para Concluído mas a tarefa continua aparecendo, ou parecer bugado porque não há contexto suficiente.

2. **Falta de contexto**: Hoje exibe apenas `titulo`, `data_execucao`, `cliente/projeto` e `titulo do card`. Não mostra **workspace**, **coluna** (status do card), nem **setor** — tornando impossível identificar a origem da tarefa.

3. **Tarefas de cards concluídos aparecem**: Não há filtro para excluir tarefas de cards que já foram movidos para a coluna "Concluído" (`status = 'done'`).

## Solução

### 1. Filtrar tarefas de cards não concluídos

Após buscar as `task_tarefas`, buscar os `tasks` correspondentes e **excluir** aqueles com `status = 'done'`.

### 2. Enriquecer a query com informações de contexto

Para cada tarefa administrativa, resolver a cadeia completa:

```
task_tarefas → tasks (title, column_id, sector_id, workspace_id, status)
                → project_columns (name) → nome da coluna
                → project_sectors (name) → nome do setor  
                → project_workspaces (nome) → nome do workspace
                → projects (name, client) → projeto e cliente
```

### 3. Atualizar a interface `TarefaItem`

Adicionar campos opcionais:
- `workspaceName?: string`
- `columnName?: string`  
- `sectorName?: string`
- `taskTitle?: string` (renomear de `subContexto`)

### 4. Atualizar o render

Exibir informações adicionais como badges ou linhas de texto:
- **Linha 1**: Título da tarefa (já existe)
- **Linha 2**: `Cliente · Projeto` (já existe como `contexto`)
- **Linha 3**: `Workspace › Coluna` (novo)
- **Linha 4**: Nome do card (já existe como `subContexto`)

## Arquivo alterado

- `src/components/Dashboard/PrazosAbertosPanel.tsx`

