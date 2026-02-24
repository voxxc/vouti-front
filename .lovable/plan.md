

## Problema: mensagens enviadas do celular com LID continuam não aparecendo corretamente

### O que descobri nos logs e banco

A mensagem das 14:01:08 **foi salva** (o fallback funcionou), mas com `from_number: 252368050503779` — um LID inválido. Isso cria uma "conversa fantasma" que não aparece na inbox real.

Dados concretos do banco:

| Hora | Direção | from_number | chatLid | chatName | raw phone |
|---|---|---|---|---|---|
| 14:01:01 | received | **5545999180026** | 23081254949024@lid | Minha Esposa | 554599180026 |
| 14:01:02 | received | **5545999180026** | 23081254949024@lid | Minha Esposa | 554599180026 |
| 14:01:08 | outgoing (fromMe) | **252368050503779** | 252368050503779@lid | (vazio) | 252368050503779@lid |

O problema: a mensagem enviada pelo celular (`fromMe=true`) tem um LID **diferente** do LID das mensagens recebidas da mesma pessoa, e o `chatName` vem **vazio**. Por isso nenhuma das estratégias de resolução funciona.

### Causa raiz

1. `normalizePhoneNumber` recebe `lid_252368050503779` e **remove o prefixo** `lid_` porque faz `.replace(/\D/g, '')` — resultado: `252368050503779` (sem o prefixo protetor)
2. Para mensagens `fromMe=true`, o Z-API envia o LID do **destinatário** (não do remetente). O `connectedPhone` (559291276333) é o número do próprio usuário
3. `chatName` vem vazio para mensagens `fromMe=true`, impedindo correlação por nome

### Solucao (2 correções)

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

**Correção 1: `normalizePhoneNumber` deve preservar prefixo `lid_`**

A função atual remove tudo que não é dígito, destruindo o prefixo `lid_`. Precisa retornar o valor original se começar com `lid_`:

```typescript
function normalizePhoneNumber(phone: string): string {
  if (phone.startsWith('lid_')) return phone; // preservar fallback
  let cleaned = phone.replace(/@.*$/, '').replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  return cleaned;
}
```

**Correção 2: Para `fromMe=true` com LID, buscar conversa recente na mesma instância**

Adicionar uma nova estratégia em `resolvePhoneFromLid` específica para `fromMe=true`: buscar a mensagem recebida mais recente na mesma instância (últimas horas) e usar o `from_number` dela como destinatário provável:

```typescript
// Estratégia especial para fromMe=true: buscar conversa ativa recente
if (data.fromMe === true && data.instanceId) {
  const { data: recentReceived } = await supabase
    .from('whatsapp_messages')
    .select('from_number')
    .eq('instance_name', data.instanceId)
    .eq('direction', 'received')
    .not('from_number', 'like', 'lid_%')
    .gt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (recentReceived?.from_number?.startsWith('55')) {
    return recentReceived.from_number;
  }
}
```

Essa heurística funciona porque: se o usuário enviou uma mensagem do celular, provavelmente é uma resposta a uma conversa recente na mesma instância.

### Resultado esperado

- Mensagens `fromMe=true` com LID serão associadas à conversa correta (baseado no histórico recente)
- Mensagens com fallback `lid_` manterão o prefixo no banco (para identificação e resolução futura)
- Caso não haja conversa recente, a mensagem será salva com `lid_` visível na inbox em vez de sumir

