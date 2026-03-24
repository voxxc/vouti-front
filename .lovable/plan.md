

# Fix: Subtarefa criada no Protocolo não aparece na Central

## Problema
Ao concluir um prazo no Protocolo e marcar "Criar subtarefa", o `tenant_id` da subtarefa é salvo como `null`. Isso acontece porque a query `fetchPrazosVinculados` (linha 172) não inclui `tenant_id` no SELECT, então `prazoData?.tenant_id` retorna `undefined`.

A Central de Subtarefas filtra por `.eq('tenant_id', tenantId)`, logo subtarefas com `tenant_id = null` nunca aparecem.

## Solução

### `src/components/Project/ProjectProtocoloContent.tsx`

1. Adicionar `tenant_id` ao SELECT da query `fetchPrazosVinculados` (linha 173):
   - De: `id, title, description, date, completed, protocolo_etapa_id, project_id,`
   - Para: `id, title, description, date, completed, protocolo_etapa_id, project_id, tenant_id,`

Isso garante que `prazoData.tenant_id` esteja disponível ao criar a subtarefa na linha 262.

| Arquivo | Mudança |
|---------|---------|
| `src/components/Project/ProjectProtocoloContent.tsx` | Adicionar `tenant_id` ao SELECT de prazos |

