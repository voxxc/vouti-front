

# Revisão CRM /demorais — Conversas desaparecendo + Preview sem atualização

## Diagnóstico

### Bug 1: Conversas aceitas desaparecem da aba "Abertas"
**Causa raiz: Limite de 1000 linhas do Supabase.**

Daniel tem **11.717 mensagens** e **175 contatos**. A query em `loadConversations` busca mensagens com `ORDER BY created_at DESC` sem `.limit()`, mas o Supabase aplica automaticamente o limite padrão de 1000 linhas. Resultado: apenas conversas com mensagens recentes (top 1000) aparecem na lista.

Dados concretos: dos 16 tickets "open" de Daniel, **14 têm sua mensagem mais recente além da posição 1000** — por isso somem da caixa de entrada.

### Bug 2: Preview da conversa não atualiza em tempo real
**Causa raiz: sinal `message_sent` não dispara `onConversationUpdate`.**

No `useWhatsAppSync`, o case `message_sent` só chama `onMessageUpdate` (atualiza o chat aberto), mas NÃO chama `onConversationUpdate` (que recarregaria a lista de conversas com o novo `lastMessage`).

---

## Solução

### 1. RPC `get_agent_conversations` (nova migration)

Criar uma função SQL que retorna conversas agrupadas por telefone com a última mensagem e contagem de não lidas, sem limite de 1000 linhas:

```sql
CREATE OR REPLACE FUNCTION get_agent_conversations(
  p_agent_id uuid, 
  p_tenant_id uuid
)
RETURNS TABLE(
  from_number text, 
  last_message text, 
  last_message_time timestamptz, 
  unread_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT ON (m.from_number)
    m.from_number,
    m.message_text,
    m.created_at,
    (SELECT count(*) FROM whatsapp_messages m2 
     WHERE m2.from_number = m.from_number 
     AND m2.agent_id = p_agent_id
     AND m2.tenant_id = p_tenant_id
     AND m2.direction = 'received' 
     AND m2.is_read = false
    )
  FROM whatsapp_messages m
  WHERE m.agent_id = p_agent_id 
    AND m.tenant_id = p_tenant_id
  ORDER BY m.from_number, m.created_at DESC;
$$;
```

Também criar uma para "Todas as Conversas":

```sql
CREATE OR REPLACE FUNCTION get_tenant_conversations(p_tenant_id uuid)
-- mesma lógica sem filtro de agent_id
```

### 2. Refatorar `loadConversations` em `WhatsAppInbox.tsx`

Substituir a query de mensagens brutas por chamada ao RPC:

```ts
const { data } = await supabase.rpc('get_agent_conversations', {
  p_agent_id: myAgentId,
  p_tenant_id: tenantId
});
```

Mapear o resultado diretamente para `WhatsAppConversation[]`, cruzando com `whatsapp_contacts` para os nomes. Também incluir conversas do `whatsapp_conversation_access` (shared).

### 3. Refatorar `loadConversations` em `WhatsAppAllConversations.tsx`

Mesma abordagem com `get_tenant_conversations`.

### 4. Corrigir `useWhatsAppSync.ts` — sinal `message_sent`

Adicionar `onConversationUpdateRef.current?.()` ao case `message_sent`:

```ts
case 'message_sent':
  onConversationUpdateRef.current?.(); // ← ADICIONAR
  onMessageUpdateRef.current?.(signal.phone);
  break;
```

Isso garante que a lista de conversas recarregue e o preview atualize quando uma mensagem é enviada.

### Resumo dos arquivos alterados

- **Nova migration SQL**: criar `get_agent_conversations` e `get_tenant_conversations`
- **`src/components/WhatsApp/sections/WhatsAppInbox.tsx`**: refatorar `loadConversations` para usar RPC
- **`src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`**: refatorar `loadConversations` para usar RPC  
- **`src/hooks/useWhatsAppSync.ts`**: adicionar `onConversationUpdate` ao case `message_sent`

