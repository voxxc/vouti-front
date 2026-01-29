

## Correção do Fluxo de Monitoramento - Webhook OAB

### Problema Identificado

O suporte da Judit explicou que o fluxo atual está **incorreto**. O webhook `judit-webhook-oab` tenta extrair movimentações diretamente do payload recebido (`payload.payload.response_data.steps`), mas o **fluxo correto** é:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO CORRETO (Judit)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Webhook recebe notificacao                                   │
│     ↓                                                            │
│     Payload contem: reference_id ou origin_id (= tracking_id)    │
│                                                                  │
│  2. GET https://tracking.prod.judit.io/tracking/{tracking_id}    │
│     ↓                                                            │
│     Retorna: dados do monitoramento + request_id                 │
│                                                                  │
│  3. GET https://requests.prod.judit.io/responses?request_id=...  │
│     ↓                                                            │
│     Retorna: dados completos do processo + movimentacoes         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo Atual (Incorreto)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO ATUAL (Errado)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Webhook recebe notificacao                                   │
│     ↓                                                            │
│  2. Tenta extrair steps de: payload.payload.response_data.steps  │
│     ↓                                                            │
│     PROBLEMA: Os dados podem não estar completos ou estar        │
│     em formato diferente do esperado                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Solução Proposta

Atualizar o webhook `judit-webhook-oab` para seguir o fluxo correto:

#### Edge Function: `judit-webhook-oab/index.ts`

**Novo fluxo implementado:**

```typescript
// 1. Receber webhook e extrair tracking_id
const trackingId = payload.reference_id || payload.origin_id;

// 2. GET /tracking/{tracking_id} para obter request_id
const trackingResponse = await fetch(
  `https://tracking.prod.judit.io/tracking/${trackingId}`,
  { headers: { 'api-key': juditApiKey } }
);
const trackingData = await trackingResponse.json();

// 3. GET /responses?request_id=... para obter dados completos
// O request_id pode vir de diferentes formas:
// - trackingData.request_id (do monitoramento)
// - trackingData.last_request_id (ultima execucao)
// - Ou precisamos buscar no historico

// 4. Processar response_data.steps (movimentacoes)
```

**Alteracoes principais:**

1. **Apos receber o `reference_id`**: Fazer GET em `/tracking/{tracking_id}` para obter dados atualizados do monitoramento

2. **Buscar historico de responses**: Fazer GET em `/tracking/{tracking_id}` com parametros de data para obter o `request_id` mais recente

3. **Consultar responses**: Com o `request_id`, fazer GET em `/responses?request_id=...` para obter os dados completos do processo

4. **Extrair movimentacoes**: Dos dados retornados, extrair `response_data.steps` ou `response_data.last_step`

5. **Manter logica de duplicatas**: Continuar usando a mesma logica de chaves unicas para evitar inserir movimentacoes duplicadas

---

### Detalhes Tecnicos

#### Estrutura esperada da resposta do GET /tracking/{tracking_id}

```json
{
  "tracking_id": "754f02d7-...",
  "status": "created",
  "recurrence": 1,
  "search": {
    "search_type": "lawsuit_cnj",
    "search_key": "0001234-55.2023.8.26.0100"
  }
}
```

Nota: Segundo a documentacao, o GET /tracking/{tracking_id} nao retorna o `request_id` diretamente. Precisamos consultar o **historico de responses** do tracking.

#### Consulta do historico de responses do tracking

```text
GET https://tracking.prod.judit.io/tracking/{tracking_id}
    ?created_at_gte=2025-01-28
    &created_at_lte=2025-01-29
```

Retorna:
```json
{
  "page_data": [
    {
      "request_id": "644a4759-...",
      "response_id": "a37ca823-...",
      "origin": "tracking",
      "origin_id": "{tracking_id}",
      "response_data": {
        "steps": [...],
        "parties": [...],
        ...
      }
    }
  ]
}
```

#### Fluxo completo no webhook

```typescript
// Passo 1: Receber tracking_id
const trackingId = payload.reference_id || payload.origin_id;

// Passo 2: Verificar se payload ja contem dados completos
// (Conforme documentacao, o webhook pode enviar os dados diretamente)
const responseDataDirect = payload.response_data || payload.payload?.response_data;

if (responseDataDirect && responseDataDirect.steps) {
  // Dados vieram direto no webhook - processar normalmente
  processSteps(responseDataDirect.steps);
} else {
  // Passo 3: Buscar dados via API
  // 3a. GET /tracking/{tracking_id} para obter historico recente
  const trackingHistoryUrl = `https://tracking.prod.judit.io/tracking/${trackingId}`;
  const historyResponse = await fetch(trackingHistoryUrl, {
    headers: { 'api-key': juditApiKey }
  });
  const historyData = await historyResponse.json();
  
  // Se tiver page_data, usar o primeiro request_id
  if (historyData.page_data && historyData.page_data.length > 0) {
    const latestRequest = historyData.page_data[0];
    const requestId = latestRequest.request_id;
    
    // 3b. GET /responses?request_id=... para dados completos
    const responsesUrl = `https://requests.prod.judit.io/responses?request_id=${requestId}`;
    const responsesData = await (await fetch(responsesUrl, {
      headers: { 'api-key': juditApiKey }
    })).json();
    
    // Processar cada response
    for (const item of responsesData.page_data || []) {
      if (item.response_data?.steps) {
        processSteps(item.response_data.steps);
      }
    }
  }
}
```

---

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/judit-webhook-oab/index.ts` | Implementar fluxo correto de consulta via GET |

---

### Consideracoes Importantes

1. **Fallback**: O webhook pode receber dados de duas formas - direto no payload OU precisando consultar. A nova implementacao deve suportar ambos.

2. **Rate limits**: Adicionar delays entre chamadas para evitar rate limiting da API Judit.

3. **Logs detalhados**: Manter logs claros para debugar o fluxo.

4. **Tratamento de erros**: Se a consulta GET falhar, logar o erro mas retornar 200 para o webhook (evitar reenvios).

5. **Manter compatibilidade**: A logica de deduplicacao de andamentos e propagacao para processos compartilhados continua igual.

---

### Beneficios

- Alinhamento com o fluxo oficial documentado pela Judit
- Maior confiabilidade na obtencao dos dados completos
- Fallback para caso o payload ja contenha os dados
- Logs claros para auditoria e debug

