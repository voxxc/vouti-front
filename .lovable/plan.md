

## Revisão das Alterações — Tudo Implementado Corretamente

### 1. "Ver Projeto" abrindo em nova aba ✓
O `onNavigateProject` na linha 1255-1257 do `AgendaContent.tsx` usa `window.open(url, '_blank')`, abrindo corretamente em nova aba. O ícone `ExternalLink` já indica visualmente esse comportamento.

### 2. Drawer não resetar ao trocar de aba do navegador ✓
O `AuthContext.tsx` (linhas 54-57) faz `return` imediato quando o evento é `TOKEN_REFRESHED`, impedindo que `setSession`/`setUser`/`setLoading` sejam chamados desnecessariamente. Isso evita re-renders em cascata que resetavam drawers abertos.

### 3. Webhook filtrando grupos e newsletters ✓
O `whatsapp-webhook/index.ts` (linha 267) verifica `data.isGroup === true || data.isNewsletter === true` no início de `handleIncomingMessage`, ignorando mensagens de grupo antes de qualquer processamento.

### 4. Polling reativo (não fixo) na Inbox ✓
- `WhatsAppInbox.tsx` (linha 149): o handler Realtime filtra `@g.us` e números > 15 chars antes de chamar `loadConversations(false)` — polling reativo só para mensagens pessoais
- `SuperAdminWhatsAppInbox.tsx`: sem `setInterval` restante — apenas Realtime subscription

### 5. Deduplicação no webhook ✓
O webhook checa `message_id` antes de inserir, evitando duplicatas por retries do Z-API.

---

**Conclusão**: Todas as alterações foram aplicadas corretamente. Não há nada pendente para corrigir.

