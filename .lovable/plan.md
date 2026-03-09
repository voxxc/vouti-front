

# Fix: Exibir Workspace nos Detalhes do Prazo

## Diagnóstico

A lógica atual tenta resolver o workspace **indiretamente** (via `protocolo_etapa` → `protocolo.workspace_id` ou via `processo_oab_id` → `project_processos.workspace_id`). Isso falha em dois cenários comuns:

1. **Prazos criados manualmente** (sem protocolo nem processo) — não têm nenhum caminho para resolver o workspace
2. **Prazos de processos** que não estão vinculados a `project_processos` — a query retorna vazio

A tabela `deadlines` **não tem coluna `workspace_id`**. Esse é o problema raiz.

## Solução

### 1. SQL Migration — Adicionar `workspace_id` à tabela `deadlines`

```sql
ALTER TABLE deadlines ADD COLUMN workspace_id UUID REFERENCES project_workspaces(id);

-- Backfill: prazos com protocolo_etapa_id
UPDATE deadlines d
SET workspace_id = pp.workspace_id
FROM project_protocolo_etapas pe
JOIN project_protocolos pp ON pp.id = pe.protocolo_id
WHERE d.protocolo_etapa_id = pe.id
  AND d.workspace_id IS NULL
  AND pp.workspace_id IS NOT NULL;

-- Backfill: prazos com processo_oab_id (sem protocolo)
UPDATE deadlines d
SET workspace_id = ppr.workspace_id
FROM project_processos ppr
WHERE d.processo_oab_id = ppr.processo_oab_id
  AND d.protocolo_etapa_id IS NULL
  AND d.workspace_id IS NULL
  AND ppr.workspace_id IS NOT NULL;

-- Backfill: prazos restantes com project_id → workspace default
UPDATE deadlines d
SET workspace_id = pw.id
FROM project_workspaces pw
WHERE d.project_id = pw.project_id
  AND pw.is_default = TRUE
  AND d.workspace_id IS NULL;
```

### 2. `AgendaContent.tsx` — Simplificar resolução do workspace

Substituir toda a lógica indireta (batch fetches de processoWorkspaceMap, workspaceIds, etc.) por um join direto:

```
workspace:project_workspaces!deadlines_workspace_id_fkey (id, nome)
```

E no mapeamento:
```ts
workspaceName: deadline.workspace?.nome || undefined
```

### 3. Pontos de criação — Salvar `workspace_id` ao criar prazos

| Arquivo | Contexto |
|---------|----------|
| `AgendaContent.tsx` | Criar com workspace default do projeto selecionado |
| `TarefasTab.tsx` | Já tem `processo_oab_id`, resolver workspace via `project_processos` |
| `TaskTarefasTab.tsx` | Tem `projectId` + `workspaceId` no contexto do componente |
| `IntimacaoCard.tsx` | Resolver via `project_processos` |
| `judit-webhook-oab/index.ts` | Resolver via `project_processos` |

### Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Adicionar coluna + backfill |
| `src/components/Agenda/AgendaContent.tsx` | Join direto + salvar workspace_id na criação |
| `src/components/Controladoria/TarefasTab.tsx` | Salvar workspace_id |
| `src/components/Project/TaskTarefasTab.tsx` | Salvar workspace_id |
| `src/components/Controladoria/IntimacaoCard.tsx` | Salvar workspace_id |
| `supabase/functions/judit-webhook-oab/index.ts` | Salvar workspace_id |
| `src/hooks/useAgendaData.ts` | Adicionar join do workspace |
| `src/types/agenda.ts` | Já tem `workspaceName` — sem mudança |

