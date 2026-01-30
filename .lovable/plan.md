
## Plano: Corrigir Webhook OAB para Suportar reference_type: request

### Problema Identificado

O suporte disparou um mock de payload e recebeu erro:
```json
{"success": false, "error": "Processo nao encontrado"}
```

**Causa raiz**: O webhook atual sempre busca processo por `tracking_id`, mas para notificações de **consulta avulsa** (`reference_type: request`), o ID recebido é um `request_id` que corresponde ao campo `detalhes_request_id` no banco.

| reference_type | O que significa | Campo no banco para busca |
|----------------|-----------------|---------------------------|
| `tracking` | Monitoramento contínuo | `tracking_id` |
| `request` | Consulta avulsa | `detalhes_request_id` |

---

### Código Atual (Problema)

```typescript
// Linha 103-108 - Busca SEMPRE por tracking_id
const { data: processo, error: fetchError } = await supabase
  .from('processos_oab')
  .select('id, numero_cnj, tenant_id, oab_id')
  .eq('tracking_id', trackingId)
  .single();
```

---

### Solução

Adicionar verificação do `reference_type` para buscar pelo campo correto:

```typescript
// Buscar processo pelo campo apropriado baseado no reference_type
let processo: any = null;
let fetchError: any = null;

if (payload.reference_type === 'request') {
  // Para consultas avulsas, buscar por detalhes_request_id
  console.log('[Judit Webhook OAB] Tipo request - buscando por detalhes_request_id...');
  const result = await supabase
    .from('processos_oab')
    .select('id, numero_cnj, tenant_id, oab_id')
    .eq('detalhes_request_id', trackingId)
    .maybeSingle();
  processo = result.data;
  fetchError = result.error;
  
  // Fallback: tentar buscar pelo número CNJ se o payload tiver essa informação
  if (!processo && payload.payload?.response_data?.code) {
    console.log('[Judit Webhook OAB] Tentando fallback por numero_cnj:', payload.payload.response_data.code);
    const resultCnj = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, tenant_id, oab_id')
      .eq('numero_cnj', payload.payload.response_data.code)
      .limit(1)
      .maybeSingle();
    processo = resultCnj.data;
    fetchError = resultCnj.error;
  }
} else {
  // Para monitoramentos, buscar por tracking_id (fluxo atual)
  console.log('[Judit Webhook OAB] Tipo tracking - buscando por tracking_id...');
  const result = await supabase
    .from('processos_oab')
    .select('id, numero_cnj, tenant_id, oab_id')
    .eq('tracking_id', trackingId)
    .maybeSingle();
  processo = result.data;
  fetchError = result.error;
}
```

---

### Fluxo Atualizado

```text
Webhook recebe payload
        │
        ▼
Extrair reference_id e reference_type
        │
        ▼
┌───────────────────────────────────────────┐
│ reference_type == 'request'?              │
├─────────────┬─────────────────────────────┤
│     SIM     │           NAO               │
│     ▼       │           ▼                 │
│ Buscar por  │  Buscar por                 │
│ detalhes_   │  tracking_id                │
│ request_id  │  (fluxo atual)              │
│     │       │                             │
│     ▼       │                             │
│ Se nao      │                             │
│ encontrar,  │                             │
│ tentar por  │                             │
│ numero_cnj  │                             │
└─────────────┴─────────────────────────────┘
        │
        ▼
Processar steps e inserir andamentos
```

---

### Alterações no Arquivo

**Arquivo**: `supabase/functions/judit-webhook-oab/index.ts`

| Linhas | Ação |
|--------|------|
| 103-116 | Substituir busca fixa por busca condicional baseada em `reference_type` |

---

### Comportamento Esperado Após Correção

1. **Notificações de monitoramento** (`reference_type: tracking`): Continua funcionando como antes, buscando por `tracking_id`

2. **Notificações de consulta avulsa** (`reference_type: request`): 
   - Primeiro tenta buscar por `detalhes_request_id`
   - Se não encontrar, tenta pelo `numero_cnj` do payload
   - Processa os andamentos normalmente

3. **Mock do suporte**: Passará a funcionar se o processo existir no banco com o `detalhes_request_id` ou `numero_cnj` correspondente
