

## Integrar processamento de campanhas no process-queue existente

### Problema

A Edge Function `whatsapp-process-campaigns` existe mas **nunca é invocada** — zero logs, zero chamadas. O cron job para ela nunca foi criado. A campanha está `paused` com todas as mensagens `cancelled`.

### Solução

Em vez de criar outro cron job (que requer SQL manual), vou integrar o processamento de campanhas **dentro do `whatsapp-process-queue`**, que já tem cron rodando a cada minuto.

### Mudanças

**Arquivo:** `supabase/functions/whatsapp-process-queue/index.ts`

Após processar as mensagens da fila normal (`whatsapp_pending_messages`), adicionar um bloco que:

1. Busca mensagens pendentes de `whatsapp_campaign_messages` com `status = 'pending'` e `scheduled_at <= now()`, join com `whatsapp_campaigns` onde `status = 'running'`
2. Para cada mensagem, resolve a instância Z-API pelo `agent_id` da campanha
3. Envia via Z-API (mesmo padrão já existente)
4. Atualiza status da mensagem para `sent` ou `failed`
5. Atualiza contadores da campanha (`sent_count`, `failed_count`)
6. Marca campanha como `completed` quando não houver mais mensagens pendentes

Isso reaproveita toda a lógica de envio, credenciais e formatação de telefone que já existe na função.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/whatsapp-process-queue/index.ts` | Adicionar bloco de processamento de campanhas ao final da função |

