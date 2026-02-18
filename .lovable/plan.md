

## Corrigir: novas conversas devem entrar em "Topo de Funil", nao em "Transferidos"

### Problema

A coluna "Transferidos" tem `column_order: 0` (primeira posicao). A funcao `autoInsertToKanban` busca a primeira coluna ordenada por `column_order` e insere novos contatos nela. Resultado: todas as novas conversas caem em "Transferidos" em vez de "Topo de Funil" (que esta em `column_order: 1`).

### Solucao

Alterar a query em `autoInsertToKanban` para pular a coluna "Transferidos" e usar a segunda coluna (Topo de Funil). A forma mais segura e filtrar pelo nome, pois a coluna "Transferidos" e fixa e padrao.

---

### Arquivo a modificar

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Na funcao `autoInsertToKanban`, adicionar `.neq("name", "Transferidos")` na query de colunas para que novas conversas sejam inseridas em "Topo de Funil" |

### Detalhe tecnico

Linha ~287-292 de `WhatsAppInbox.tsx`:

```text
// Antes:
const { data: columns } = await supabase
  .from("whatsapp_kanban_columns")
  .select("id")
  .eq("agent_id", agentId)
  .order("column_order", { ascending: true })
  .limit(1);

// Depois:
const { data: columns } = await supabase
  .from("whatsapp_kanban_columns")
  .select("id")
  .eq("agent_id", agentId)
  .neq("name", "Transferidos")
  .order("column_order", { ascending: true })
  .limit(1);
```

Isso faz a query ignorar a coluna "Transferidos" e retornar "Topo de Funil" como primeira opcao. A coluna "Transferidos" continua sendo usada apenas para conversas que foram efetivamente transferidas entre agentes (via `TransferConversationDialog`).

