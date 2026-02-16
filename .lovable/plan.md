

## Corrigir envio de mensagens: cada agente usa sua propria instancia

### Problema

1. **Instancia errada selecionada**: A edge function `whatsapp-send-message` busca a instancia WhatsApp filtrando apenas por `tenant_id` e pegando a primeira. No tenant `/demorais`, Daniel e Laura tem instancias separadas, mas o sistema pode pegar a instancia errada.

2. **Status desatualizado**: A instancia do Daniel esta marcada como "disconnected" no banco, mesmo podendo estar conectada na Z-API. O status so atualiza quando alguem abre o drawer de configuracao do agente e clica em "Verificar Status". Nao ha sincronizacao automatica.

### Solucao

#### 1. Edge Function `whatsapp-send-message/index.ts` - Resolver instancia pelo agentId

Alterar a logica de resolucao de instancia (linhas 65-76):

**Antes:**
```
Busca por tenant_id -> limit(1) -> pega qualquer uma
```

**Depois:**
```
Se agentId fornecido:
  -> Buscar WHERE agent_id = agentId (instancia especifica do agente)
Se nao encontrou ou nao tem agentId:
  -> Fallback: buscar WHERE tenant_id = tenantId (retrocompatibilidade)
```

Isso garante que Daniel envia pela instancia do Daniel, Laura pela da Laura.

#### 2. Edge Function `whatsapp-send-message/index.ts` - Remover filtro de connection_status

Nao filtrar por `connection_status` na busca, pois o status no banco pode estar desatualizado. A Z-API retornara erro se realmente estiver desconectada, e esse erro ja e tratado.

#### 3. Status automatico via webhook - Atualizar status quando mensagens chegam

No webhook que recebe mensagens da Z-API, adicionar logica para atualizar o `connection_status` da instancia para `connected` sempre que uma mensagem for recebida com sucesso. Isso mantem o status sincronizado sem depender de verificacao manual.

Preciso verificar qual arquivo de webhook faz isso:

- Identificar o webhook handler (provavelmente `whatsapp-webhook/index.ts`)
- Ao processar uma mensagem recebida com sucesso, fazer UPDATE na `whatsapp_instances` setando `connection_status = 'connected'` e `updated_at = now()` para a instancia correspondente

### Arquivos a editar

1. **`supabase/functions/whatsapp-send-message/index.ts`** - Priorizar busca por `agent_id`
2. **Webhook de recebimento** (a identificar) - Atualizar status para `connected` ao receber mensagens

### Resultado

- Cada agente envia mensagens exclusivamente pela sua propria instancia Z-API
- O status da instancia se mantem atualizado automaticamente conforme mensagens sao recebidas
- Nenhuma mudanca no frontend necessaria (o `agentId` ja e enviado pelo frontend)
