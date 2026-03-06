

## Plano: Polling Reativo + Filtro de Grupos no Webhook

### Problema
1. O usuário quer que o polling de conversas seja **reativo** (disparado quando chega mensagem), não um intervalo fixo de 15-20s
2. O webhook não filtra mensagens de grupo — elas poluem a caixa de entrada
3. Não há deduplicação por `message_id` no webhook

### Mudanças

#### A. `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
O Realtime subscription (linha 136-155) já detecta INSERTs. Basta garantir que o `loadConversations(false)` seja chamado silenciosamente quando chegar uma mensagem pessoal. **Remover qualquer polling por intervalo fixo**, se existir. O handler atual na linha 146-148 já faz isso — apenas precisa:
- Filtrar mensagens de grupo no handler Realtime (ignorar `from_number` contendo `@g.us` ou com mais de 15 dígitos)
- Normalizar `from_number` no handler de mensagens da conversa selecionada (já feito na linha 177)

#### B. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`
- **Remover os dois `setInterval` de polling** (linhas ~190-197 e ~200-208) — são intervalos fixos de 2s
- Manter apenas o Realtime subscription que já existe, que já chama `loadConversations(false)` ao receber INSERT

#### C. `supabase/functions/whatsapp-webhook/index.ts`
No início de `handleIncomingMessage` (linha 265), adicionar:

1. **Filtrar grupos**: checar `data.isGroup === true` ou `data.isNewsletter === true` → return early
2. **Filtrar por `@g.us`**: se `rawPhone` contiver `@g.us`, ignorar
3. **Deduplicação por `message_id`**: antes de inserir, checar se `messageId` já existe na tabela → se sim, ignorar

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-webhook/index.ts` | Filtrar grupos + deduplicação |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Filtrar grupos no Realtime handler |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx` | Remover polling por intervalo fixo (2s) |

