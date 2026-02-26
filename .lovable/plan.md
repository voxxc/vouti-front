

## Corrigir mistura de conversas no CRM

### Problema raiz

Há **3 bugs de normalização de telefone** que fazem mensagens de um contato aparecerem na conversa de outro:

---

### Bug 1 — `WhatsAppAllConversations` armazena `contactNumber` cru (não normalizado)

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`, linha 107

O agrupamento usa `normalizedNumber` como chave do Map, mas armazena o `number` **bruto** (do DB) como `contactNumber`. Quando `loadMessages` é chamado com esse número bruto, a query `.eq("from_number", contactNumber)` busca apenas uma variante, podendo carregar mensagens erradas ou incompletas.

**Correção:** Trocar `contactNumber: number` por `contactNumber: normalizedNumber` na linha 107.

---

### Bug 2 — `WhatsAppAllConversations.loadMessages` não usa variantes de telefone

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`, linhas 130-134

A query usa `.eq("from_number", contactNumber)` sem considerar variantes (com/sem nono dígito). O Inbox já faz isso corretamente com `getPhoneVariant` + `.or()`.

**Correção:** Normalizar o `contactNumber`, gerar variante, e usar `.or()` quando variante existir — mesmo padrão do `WhatsAppInbox.loadMessages` (linhas 355-382).

---

### Bug 3 — `WhatsAppInbox` real-time não normaliza `from_number`

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`, linha 177

```js
if (newMsg.from_number === selectedConversation.contactNumber)
```

Comparação direta sem normalizar. Se o DB tiver "5511912345678" e o `contactNumber` for "11912345678" (ou vice-versa), mensagens de outro contato podem entrar na conversa errada, ou mensagens corretas não aparecem.

**Correção:** Usar `normalizePhone()` em ambos os lados:
```js
if (normalizePhone(newMsg.from_number) === normalizePhone(selectedConversation.contactNumber))
```

---

### Resumo de mudanças

| Arquivo | Linha(s) | Correção |
|---|---|---|
| `WhatsAppAllConversations.tsx` | 107 | `contactNumber: normalizedNumber` |
| `WhatsAppAllConversations.tsx` | 130-134 | Usar `normalizePhone` + `getPhoneVariant` + `.or()` |
| `WhatsAppInbox.tsx` | 177 | `normalizePhone()` na comparação real-time |

