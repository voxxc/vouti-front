

## Plano: Normalizar Telefones e Unificar Conversa Laura Dama

### Diagnóstico

O contato Laura Dama (`5545999180026`) teve suas mensagens divididas em duas conversas devido a inconsistência no formato do número:

| Mensagem | Número | Problema |
|----------|--------|----------|
| Mensagem inicial do bot | `5545999180026` | Correto (13 dígitos) |
| Respostas via webhook | `554599180026` | Falta o 9 (12 dígitos) |

**Causa:** A Z-API envia o número sem o nono dígito obrigatório para celulares brasileiros. O sistema atual não normaliza o número ao receber no webhook.

---

### Solução em 3 Partes

#### Parte 1: Normalizar Telefones no Webhook (Prevenção)

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Adicionar função de normalização que garante o formato correto:

```typescript
// Normaliza telefone brasileiro para formato com 9 dígitos
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
  // Ex: 554599180026 -> 5545999180026
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    // Celulares brasileiros começam com 9 após DDD
    return `55${ddd}9${number}`;
  }
  
  return cleaned;
}
```

Aplicar na função `handleIncomingMessage()`:
```typescript
async function handleIncomingMessage(data: any) {
  const { instanceId, phone, messageId, text, chatName, momment, fromMe } = data;
  
  // ✅ Normalizar telefone ANTES de salvar
  const normalizedPhone = normalizePhoneNumber(phone);
  console.log(`📞 Telefone normalizado: ${phone} -> ${normalizedPhone}`);
  
  // Usar normalizedPhone em todo o resto da função...
}
```

---

#### Parte 2: Normalizar no Inbox (Agrupamento Robusto)

**Arquivos:**
- `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`
- `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

Modificar a lógica de agrupamento para normalizar números ao agrupar:

```typescript
// Função helper para normalizar telefone
const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adicionar o 9
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    return `55${ddd}9${number}`;
  }
  return cleaned;
};

// No loadConversations():
messagesResult.data?.forEach((msg) => {
  const normalizedNumber = normalizePhone(msg.from_number);
  if (!conversationMap.has(normalizedNumber)) {
    conversationMap.set(normalizedNumber, {
      id: msg.id,
      contactName: contactNameMap.get(normalizedNumber) || 
                   contactNameMap.get(msg.from_number) || 
                   normalizedNumber,
      contactNumber: normalizedNumber,
      // ...
    });
  }
});
```

E no `loadMessages()`:
```typescript
const loadMessages = useCallback(async (contactNumber: string) => {
  // Buscar mensagens por ambos os formatos (com e sem 9)
  const normalized = normalizePhone(contactNumber);
  const variant = // versão sem o 9 se aplicável
  
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .is("tenant_id", null)
    .or(`from_number.eq.${normalized},from_number.eq.${variant}`)
    .order("created_at", { ascending: true });
});
```

---

#### Parte 3: Corrigir Dados Existentes (Migração)

**Migração SQL** para unificar as mensagens da Laura Dama:

```sql
-- Atualizar mensagens com número incompleto para o formato correto
UPDATE whatsapp_messages
SET from_number = '5545999180026'
WHERE from_number = '554599180026'
  AND tenant_id IS NULL;

-- Garantir que o contato salvo tenha o formato correto (já está)
-- phone = '5545999180026' ✓
```

---

### Arquivos a Modificar

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Edge Function | Adicionar normalização de telefone |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx` | Frontend | Normalizar ao agrupar conversas |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Frontend | Normalizar ao agrupar conversas |
| Migração SQL | Banco | Corrigir números existentes |

---

### Fluxo Após Correção

```text
┌───────────────────────────────────────────────────────────────┐
│ ANTES (PROBLEMA)                                              │
├───────────────────────────────────────────────────────────────┤
│ Bot envia → 5545999180026                                     │
│ Lead responde → 554599180026 (Z-API remove o 9)               │
│ → DUAS conversas diferentes!                                  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ DEPOIS (SOLUÇÃO)                                              │
├───────────────────────────────────────────────────────────────┤
│ Bot envia → 5545999180026                                     │
│ Lead responde → 554599180026 → normaliza → 5545999180026      │
│ → MESMA conversa!                                             │
└───────────────────────────────────────────────────────────────┘
```

---

### Detalhes Técnicos

**Regra de normalização brasileira:**

Celulares no Brasil têm 9 dígitos após o DDD desde 2016. Se o número chega com 8 dígitos após DDD, é um celular e precisa do 9 prefixado.

```text
55 + DDD(2) + Número(8) = 12 dígitos → INCOMPLETO
55 + DDD(2) + 9 + Número(8) = 13 dígitos → CORRETO
```

Exemplo Laura Dama:
- Recebido: `554599180026` (12 dígitos)
- DDD: `45`, Número: `99180026`
- Normalizado: `55` + `45` + `9` + `9180026` = `5545999180026`

