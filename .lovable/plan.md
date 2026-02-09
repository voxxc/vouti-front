

## Correcao: Mensagens enviadas pelo celular nao aparecem na Caixa de Entrada

### Problema Identificado

Nos logs da edge function `whatsapp-webhook`, ha erros "Invalid webhook data received" nos horarios exatos em que voce enviou mensagens pelo celular (18:31:54 e 18:24:06). Isso significa que a funcao de validacao (`validateWebhookData`) esta rejeitando o payload da Z-API para mensagens `fromMe: true`.

A validacao atual so aceita os tipos `ReceivedCallback` e `message` com validacao rigorosa do campo `phone` (regex `^\d{10,15}$`). Quando voce envia uma mensagem pelo celular, a Z-API pode enviar o webhook com um tipo diferente (ex: `"SentByMeCallback"`) ou com o campo `phone` em formato diferente, e a validacao bloqueia antes de chegar na logica de processamento.

### Solucao

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

1. Adicionar log do payload bruto ANTES da validacao para diagnosticar o formato exato que a Z-API envia para mensagens `fromMe: true`
2. Flexibilizar a funcao `validateWebhookData` para aceitar tipos adicionais de webhook da Z-API (como `SentByMeCallback`, `MessageStatusCallback`, etc.)
3. Tratar payloads com `fromMe: true` que podem vir com campo `phone` ausente mas com `chatId` ou estrutura diferente

### Alteracoes detalhadas

**1. Log de diagnostico antes da validacao**

Adicionar um `console.log` do payload bruto antes de chamar `validateWebhookData`, para que possamos ver exatamente o que a Z-API esta enviando quando voce manda uma mensagem pelo celular.

**2. Flexibilizar a validacao**

```text
function validateWebhookData(data):
  - Aceitar tipo 'ReceivedCallback' (ja aceito)
  - Aceitar tipo 'message' (ja aceito)  
  - Aceitar tipo 'status' (ja aceito)
  - Aceitar tipo 'qrcode' (ja aceito)
  - NOVO: Aceitar QUALQUER tipo desconhecido com log (nao rejeitar)
  - Mover validacao de phone para ser condicional (so quando ReceivedCallback/message)
```

**3. Roteamento do tipo de webhook**

No bloco de roteamento (linha 94-105), adicionar tratamento para que mensagens com `fromMe: true` de qualquer tipo reconhecido sejam encaminhadas para `handleIncomingMessage`, que ja tem a logica correta de salvar mensagens do celular.

### Resumo tecnico

A raiz do problema e que a funcao de validacao e muito restritiva e rejeita payloads validos da Z-API. A correcao torna a validacao mais permissiva (aceita tipos desconhecidos com log) e garante que mensagens `fromMe: true` sempre sejam processadas e salvas no banco, aparecendo na Caixa de Entrada via polling.

