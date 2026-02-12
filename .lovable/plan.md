

## Vincular mensagens ao agent_id no webhook do WhatsApp

### Problema identificado

A instancia da Juliana esta **conectada** (status: connected, credenciais Z-API configuradas), porem todas as mensagens do tenant /demorais tem `agent_id = NULL`. Isso acontece porque o webhook (`whatsapp-webhook/index.ts`) nunca resolve o `agent_id` a partir da instancia que recebeu a mensagem.

Como a Caixa de Entrada filtra mensagens por `agent_id = meuAgentId`, a inbox da Juliana aparece vazia.

### Causa raiz

O webhook ja faz o lookup da instancia pelo `zapi_instance_id`, mas a query nao inclui o campo `agent_id`:

```text
SELECT user_id, tenant_id, zapi_url, zapi_token, ...
FROM whatsapp_instances
WHERE zapi_instance_id = '{instanceId}'
```

O campo `agent_id` existe na tabela `whatsapp_instances` mas nao e extraido, nem propagado para o INSERT das mensagens.

### O que sera feito

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Incluir `agent_id` na query de instancia e propagar para todos os inserts de mensagens |

### Detalhes tecnicos

**1. Query da instancia** (linha ~217)
- Adicionar `agent_id` ao SELECT da query de `whatsapp_instances`

**2. Insert de mensagem recebida** (linha ~264)
- Adicionar `agent_id: instance.agent_id || null` no objeto de insert

**3. Insert de mensagem fromMe (celular)** (linha ~239)
- Adicionar `agent_id: instance.agent_id || null` no objeto de insert

**4. Funcao `saveOutgoingMessage`** (linha ~107)
- Adicionar parametro `agent_id` opcional
- Propagar para o insert

**5. Todas as chamadas a `saveOutgoingMessage`**
- Passar `instance.agent_id` nas chamadas do webhook (automacoes, IA, etc)

**6. Correcao retroativa dos dados existentes**
- Executar um UPDATE SQL para vincular as mensagens existentes do tenant /demorais a Juliana, baseado na instancia que as recebeu

### Correcao retroativa (SQL)

Atualizar mensagens existentes que ja tem o `instance_name` correspondente ao `zapi_instance_id` da Juliana:

```text
UPDATE whatsapp_messages
SET agent_id = 'acef3363-ddf4-4e4e-b882-eb3f2a1a77fb'
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND agent_id IS NULL
  AND instance_name = '3EEA42BEEE25822E2DC0923B12608CB0';
```

### Resultado esperado

- Novas mensagens recebidas pela instancia da Juliana terao `agent_id` preenchido automaticamente
- Mensagens existentes serao retroativamente vinculadas
- A Caixa de Entrada da Juliana mostrara todas as conversas dela
- O Kanban CRM da Juliana sera populado automaticamente com os contatos

