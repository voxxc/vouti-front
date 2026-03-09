

# Fix: Workspace ainda não aparece nos detalhes do prazo

## Diagnóstico

A coluna `workspace_id` existe e o código de exibição está correto (linha 1255-1260 do AgendaContent). O problema: **34 de 216 prazos ainda têm `workspace_id = NULL`** porque o backfill anterior não cobriu todos os casos:

- **29 prazos** com `processo_oab_id` mas o processo não está em `project_processos` (sem vínculo workspace)
- **2 prazos** com `protocolo_etapa_id` mas cujo backfill falhou
- **3 prazos** sem processo, sem etapa, sem projeto (órfãos)

## Solução

### 1. Migration SQL — Backfill mais amplo

Para os 29 prazos com `processo_oab_id` sem entrada em `project_processos`, resolver via `project_id` → workspace default do projeto:

```sql
-- Prazos com project_id mas sem workspace_id: usar workspace default
UPDATE deadlines d
SET workspace_id = pw.id
FROM project_workspaces pw
WHERE d.project_id = pw.project_id
  AND pw.is_default = TRUE
  AND d.workspace_id IS NULL;

-- Prazos sem project_id: tentar resolver via processo_oab → project_processos → workspace
UPDATE deadlines d
SET workspace_id = pp.workspace_id
FROM project_processos pp
WHERE d.processo_oab_id = pp.processo_oab_id
  AND d.workspace_id IS NULL
  AND pp.workspace_id IS NOT NULL;
```

### 2. Fallback no código — Resolver em runtime para prazos sem workspace_id

No `AgendaContent.tsx`, para deadlines que AINDA não tenham `workspace_id` após backfill, tentar resolver via `protocolo_etapa.protocolo.workspace_id` como fallback no mapeamento.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Backfill mais amplo |
| `src/components/Agenda/AgendaContent.tsx` | Fallback: usar workspace do protocolo se `workspace_id` é null |

