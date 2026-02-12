

## Propagar agent_id na IA (debounce) e corrigir respostas da Juliana

### Problema

O webhook ja resolve o `agent_id` da instancia, mas quando dispara o debounce da IA, nao envia o `agent_id` no payload. A funcao debounce tambem nao o recebe nem propaga para o insert. Resultado: respostas da IA ficam com `agent_id = NULL` e nao aparecem na Caixa de Entrada.

### Alteracoes

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar `agent_id` no body do fire-and-forget para o debounce (linha 510-518) |
| `supabase/functions/whatsapp-ai-debounce/index.ts` | Receber `agent_id`, adicionar parametro na `saveOutgoingMessage`, propagar no insert |

### Detalhes tecnicos

**1. whatsapp-webhook (linha 510-518)** - Adicionar `agent_id` ao body:

```text
body: JSON.stringify({
  phone,
  tenant_id,
  instance_id: instanceId,
  scheduled_at: scheduledAt,
  user_id,
  delay_seconds: delaySeconds,
  instance_credentials: instanceCredentials,
  agent_id,   // NOVO
}),
```

**2. whatsapp-ai-debounce** - Tres mudancas:

a) Linha 49 - Extrair `agent_id` do payload:
```text
const { phone, tenant_id, instance_id, scheduled_at, user_id, delay_seconds, instance_credentials, agent_id } = await req.json();
```

b) Linhas 14-20 - Adicionar parametro `agent_id` na funcao `saveOutgoingMessage`:
```text
async function saveOutgoingMessage(
  phone, message, tenant_id, instance_name, user_id?, agent_id?
) {
  // ...insert com agent_id: agent_id || null
}
```

c) Linha 31 - Incluir `agent_id` no insert:
```text
agent_id: agent_id || null,
```

d) Linha 156 - Passar `agent_id` na chamada:
```text
await saveOutgoingMessage(phone, aiData.response, tenant_id, instance_id, user_id, agent_id);
```

### Resultado

- Respostas da IA (com debounce) terao `agent_id` da Juliana
- Mensagens recebidas dos leads ja estao com `agent_id` (corrigido no diff anterior)
- Toda a conversa (ida e volta) aparecera na Caixa de Entrada da Juliana

