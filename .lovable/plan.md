
## Correcoes para Suporte Completo a API Oficial do WhatsApp (Meta)

### Problemas Identificados

O sistema atualmente so envia respostas da IA via Z-API. Quando a instancia usa a API Oficial do Meta, a IA processa a mensagem, gera a resposta, mas **nunca a envia** porque nao existe logica de envio via Meta. Alem disso, o tipo de midia e sempre salvo como "text".

### Correcoes Planejadas

**1. `supabase/functions/whatsapp-meta-webhook/index.ts`**

- Salvar `message_type` correto (`image`, `audio`, `video`, `document`, `text`) em vez de sempre `'text'`
- Buscar URLs reais de midia do Meta (endpoint `GET graph.facebook.com/v21.0/{media_id}`) e salvar no `raw_data` no formato que o frontend espera
- Corrigir roteamento de agente: priorizar o kanban do agente dono da instancia antes de buscar em outros kanbans (padrao do Z-API)
- Passar `provider: 'meta'` e credenciais Meta ao chamar o debounce, para que ele saiba como enviar a resposta

**2. `supabase/functions/whatsapp-ai-debounce/index.ts`**

- Adicionar logica de envio via Meta API apos gerar a resposta da IA
- Se receber `provider: 'meta'`, buscar a instancia no banco para obter `meta_phone_number_id` e `meta_access_token`
- Enviar via `POST graph.facebook.com/v21.0/{phone_number_id}/messages` com `messaging_product: 'whatsapp'`
- Manter envio via Z-API como fallback para instancias nao-Meta

**3. `supabase/functions/whatsapp-webhook/index.ts`**

- Na funcao `handleAIResponse` (resposta imediata sem debounce), adicionar a mesma logica de envio condicional
- Buscar a instancia no banco para verificar se e `provider: 'meta'`
- Se for Meta, enviar via Graph API; se nao, manter Z-API

### Logica de Envio Condicional (aplicada nos 2 pontos de envio)

```text
// Apos gerar resposta da IA e salvar no banco:
1. Buscar instancia: SELECT provider, meta_phone_number_id, meta_access_token 
   FROM whatsapp_instances WHERE instance_name = instance_id OR agent_id = agent_id

2. Se provider = 'meta':
   POST graph.facebook.com/v21.0/{meta_phone_number_id}/messages
   Headers: Authorization: Bearer {meta_access_token}
   Body: { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }

3. Se provider != 'meta':
   Logica Z-API existente (sem alteracao)
```

### Correcao de message_type no Meta Webhook

```text
// Antes: message_type: 'text' (fixo)
// Depois: message_type mapeado corretamente
const metaTypeMap = {
  'text': 'text',
  'image': 'image', 
  'audio': 'audio',
  'video': 'video',
  'document': 'document',
  'location': 'text',
  'contacts': 'text',
  'sticker': 'sticker'
};
message_type: metaTypeMap[type] || 'text'
```

### Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-meta-webhook/index.ts` | Corrigir message_type, raw_data com URLs de midia, roteamento de agente, dados do debounce |
| `supabase/functions/whatsapp-ai-debounce/index.ts` | Adicionar envio via Meta API alem de Z-API |
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar envio via Meta API na resposta imediata da IA |
