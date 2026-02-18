

## Mover leads incorretos de "Transferidos" para "Topo de Funil"

### Problema

O fix no codigo (`.neq("name", "Transferidos")`) ja esta correto e novas conversas futuras irao para "Topo de Funil". Porem, existem **10 leads** que foram inseridos em "Transferidos" antes do fix -- todos com `transferred_from_agent_id = NULL`, ou seja, nao foram transferidos de verdade.

### Solucao

Criar uma migracao SQL que move esses leads para a coluna "Topo de Funil" do respectivo agente.

---

### Arquivo a criar

| Arquivo | Acao |
|---|---|
| **Migracao SQL** | Mover cards de "Transferidos" sem `transferred_from_agent_id` para "Topo de Funil" |

### Detalhe tecnico

A migracao faz o seguinte:
1. Para cada card em "Transferidos" onde `transferred_from_agent_id IS NULL` (nao foi transferido de verdade)
2. Busca a coluna "Topo de Funil" do mesmo agente
3. Move o card para essa coluna

```text
UPDATE whatsapp_conversation_kanban wck
SET column_id = topo.id
FROM whatsapp_kanban_columns transferidos,
     whatsapp_kanban_columns topo
WHERE wck.column_id = transferidos.id
  AND transferidos.name = 'Transferidos'
  AND topo.agent_id = transferidos.agent_id
  AND topo.name = 'Topo de Funil'
  AND wck.transferred_from_agent_id IS NULL;
```

Isso corrige os 10 leads existentes e vale para todos os tenants. Leads que possuem `transferred_from_agent_id` preenchido (transferencias reais) permanecem em "Transferidos".

### Resultado

- Os 10 leads incorretamente em "Transferidos" serao movidos para "Topo de Funil"
- Novas conversas continuam indo para "Topo de Funil" (fix ja aplicado no codigo)
- Transferencias reais entre agentes continuam funcionando normalmente na coluna "Transferidos"

