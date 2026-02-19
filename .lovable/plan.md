

## Corrigir 297 mensagens mal-roteadas e garantir que o fix funcione

### Problema encontrado

O fix de roteamento no webhook foi deployado, mas **297 mensagens** que ja estavam salvas no banco continuam com o `agent_id` errado. Todas sao mensagens que chegaram pela instancia do Daniel mas foram salvas com o agent_id da Laura ou da Juliana.

Resumo dos contatos afetados:

| Contato | Msgs erradas | Agente errado | Agente correto |
|---|---|---|---|
| 5545999180026 | ~208 | Laura | Daniel |
| 5545988282387 | 3 | Laura | Daniel |
| 5592991276333 | 6 | Laura | Daniel |
| 5545988083583 | 55 | Juliana | Daniel |
| 5592984940166 | 7 | Juliana | Daniel |
| 5545998147710 | 5 | Juliana | Daniel |
| 5545999445655 | 4 | Juliana | Daniel |
| 5545998011658 | 1 | Juliana | Daniel |
| 5544935051259 | 5 | Juliana | Daniel |
| Outros | ~3 | Juliana | Daniel |

### Correcoes

**1. UPDATE em massa das 297 mensagens** (dados, nao schema)

Uma unica query que corrige todas as mensagens de uma vez, usando a tabela `whatsapp_instances` como fonte de verdade:

```sql
UPDATE whatsapp_messages m
SET agent_id = wi.agent_id
FROM whatsapp_instances wi
WHERE wi.zapi_instance_id = m.instance_name
  AND m.agent_id IS NOT NULL
  AND wi.agent_id IS NOT NULL
  AND m.agent_id != wi.agent_id
  AND m.tenant_id IS NOT NULL
```

A logica e simples: o `agent_id` correto de cada mensagem e o agente dono da instancia que recebeu/enviou a mensagem.

**2. Verificacao pos-fix**

Rodar a mesma query de deteccao para confirmar que zero mensagens estao mal-roteadas:

```sql
SELECT COUNT(*) FROM whatsapp_messages m
JOIN whatsapp_instances wi ON wi.zapi_instance_id = m.instance_name
WHERE m.agent_id != wi.agent_id AND m.tenant_id IS NOT NULL
```

O resultado esperado e 0.

**3. O fix no webhook ja esta deployado** 

O codigo em `whatsapp-webhook/index.ts` ja prioriza o kanban do agente da instancia. As mensagens misrouted de hoje (16:20-16:42) foram processadas por instancias "quentes" que ainda rodavam o codigo antigo antes do deploy se propagar totalmente. Novas mensagens devem ser roteadas corretamente.

### Nenhuma mudanca de codigo necessaria

O fix no webhook ja esta correto e deployado. A unica acao necessaria e o UPDATE dos dados historicos.
