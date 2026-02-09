
## Plano: Tempo de Espera (Debounce) antes da Resposta da IA

### Por que nao pode ser no prompt?

A IA e chamada pelo webhook a cada mensagem recebida. Ela nao tem como "esperar" mensagens futuras -- quando e invocada, ja precisa responder. O controle de tempo precisa ser feito no proprio webhook, antes de chamar a IA.

### Como vai funcionar

1. Cliente envia mensagem -> webhook salva no banco normalmente
2. Em vez de chamar a IA imediatamente, o webhook registra um "timer pendente" no banco
3. Se o cliente envia outra mensagem dentro do intervalo, o timer e resetado
4. Quando o timer expira (sem novas mensagens), uma funcao separada processa todas as mensagens acumuladas e envia uma unica resposta

```text
Cliente envia "Oi"          -> salva msg, cria timer (6s)
Cliente envia "tudo bem?"   -> salva msg, reseta timer (6s)
Cliente envia "preciso..."  -> salva msg, reseta timer (6s)
... 6 segundos sem msg ...  -> IA processa TODAS as 3 msgs juntas -> responde
```

### Arquitetura

**Nova tabela: `whatsapp_ai_pending_responses`**
- `id` (uuid, PK)
- `phone` (text) - telefone do contato
- `tenant_id` (uuid, nullable)
- `instance_id` (text) - instanceId do webhook
- `user_id` (uuid)
- `scheduled_at` (timestamptz) - quando a IA deve responder
- `created_at` (timestamptz)
- `status` (text) - 'pending' | 'processing' | 'done'

**Nova coluna em `whatsapp_ai_config`:**
- `response_delay_seconds` (integer, default 0) - tempo de espera configuravel (0 = resposta imediata, comportamento atual)

**Nova Edge Function: `whatsapp-ai-debounce`**
- Chamada pelo webhook via `setTimeout` apos o delay configurado
- Verifica se `scheduled_at` ainda e valido (nao foi resetado por nova mensagem)
- Se valido, busca todas as mensagens pendentes do contato e chama a IA com todas juntas

### Alteracoes

**1. Migracao SQL**
- Criar tabela `whatsapp_ai_pending_responses`
- Adicionar coluna `response_delay_seconds` (default 0) em `whatsapp_ai_config`

**2. Edge Function `whatsapp-webhook/index.ts`**
- Na funcao `handleAIResponse`: verificar `aiConfig.response_delay_seconds`
- Se > 0: em vez de chamar a IA, fazer upsert em `whatsapp_ai_pending_responses` com `scheduled_at = now() + delay`
- Depois, chamar a nova edge function `whatsapp-ai-debounce` com um delay (via `setTimeout` no proprio webhook antes de retornar, ou via invocacao assincrona)
- Se = 0: comportamento atual (resposta imediata)

**3. Nova Edge Function `whatsapp-ai-debounce/index.ts`**
- Recebe: phone, tenant_id, instance_id, scheduled_at
- Aguarda o tempo necessario (usando `await new Promise(resolve => setTimeout(resolve, delayMs))`)
- Verifica no banco se `scheduled_at` do registro pendente ainda bate (se o cliente mandou outra msg, o `scheduled_at` tera sido atualizado e sera diferente)
- Se bate: busca todas as mensagens recentes do contato, concatena, chama `whatsapp-ai-chat`, envia resposta via Z-API
- Se nao bate: ignora (outro timer mais recente esta ativo)

**4. UI - `WhatsAppAISettings.tsx`**
- Adicionar campo "Tempo de Espera" nas Configuracoes Avancadas
- Slider ou input numerico (0 a 30 segundos)
- Label: "Tempo de espera antes de responder"
- Descricao: "O agente aguarda este tempo apos a ultima mensagem antes de responder. Permite que o cliente termine de digitar."
- Valor 0 = "Resposta imediata (padrao)"

### Fluxo detalhado no webhook

```text
handleAIResponse():
  1. Buscar aiConfig (ja existe)
  2. Se response_delay_seconds == 0 → fluxo atual (chamar IA direto)
  3. Se response_delay_seconds > 0:
     a. Upsert em whatsapp_ai_pending_responses:
        - phone + tenant_id como chave unica
        - scheduled_at = now() + delay
        - status = 'pending'
     b. Disparar fetch assincrono para whatsapp-ai-debounce
        (sem await, fire-and-forget)
     c. Retornar true (msg foi tratada, nao cair no fallback de automacoes)
```

### Detalhes tecnicos

- O debounce funciona via "optimistic locking": cada invocacao do debounce recebe o `scheduled_at` que gerou. Se ao verificar no banco o valor mudou, significa que outra mensagem chegou e resetou o timer
- A edge function `whatsapp-ai-debounce` usa `setTimeout`/`sleep` interno para aguardar o delay antes de verificar
- Unique constraint em `(phone, tenant_id)` na tabela de pendentes para garantir apenas 1 timer ativo por contato
- Mensagens continuam sendo salvas normalmente no `whatsapp_messages` pelo webhook (isso ja acontece)
- A IA recebera todas as mensagens do historico recente como contexto (ja funciona via `max_history`)
