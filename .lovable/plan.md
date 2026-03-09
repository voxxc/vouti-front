

# Exibir Workspace nos Detalhes do Prazo

## Problema
Os detalhes do prazo não mostram a qual workspace ele pertence. Em tenants como Solvenza, onde projetos têm múltiplos workspaces, é essencial saber de qual workspace vem o prazo.

## Abordagem

A tabela `deadlines` não tem `workspace_id` diretamente, mas o workspace pode ser resolvido por duas vias:
- Via `protocolo_etapa_id` → `project_protocolo_etapas` → `project_protocolos.workspace_id` → `project_workspaces.nome`
- Via `processo_oab_id` → `project_processos.workspace_id` → `project_workspaces.nome`

### Mudanças

**1. `src/types/agenda.ts`** — Adicionar campo `workspaceName?: string` ao tipo `Deadline`

**2. `src/components/Agenda/AgendaContent.tsx`** — No `fetchDeadlinesAsync`:
- Expandir o select do `protocolo_etapa` para incluir `protocolo:project_protocolos(id, nome, project_id, processo_oab_id, workspace_id)`
- Coletar todos os `workspace_id`s encontrados (de protocolos e de processos)
- Para processos diretos (`processo_oab_id` sem `protocolo_etapa_id`), buscar `project_processos` para obter o `workspace_id`
- Batch fetch em `project_workspaces` com os IDs coletados para obter os nomes
- Mapear `workspaceName` no objeto `Deadline`

**3. `src/components/Agenda/AgendaContent.tsx`** — No dialog de detalhes (linha ~1220):
- Adicionar campo "Workspace" ao lado de "Projeto" no grid, exibindo `selectedDeadline.workspaceName` quando disponível

| Arquivo | Mudança |
|---------|---------|
| `src/types/agenda.ts` | Adicionar `workspaceName?: string` ao `Deadline` |
| `src/components/Agenda/AgendaContent.tsx` | Resolver workspace via protocolos/processos + exibir no dialog |

