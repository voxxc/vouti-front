

## Plano: Fazer Conversas Iniciadas pelo Bot Aparecerem na Caixa de Entrada

### Problema Identificado

Quando o bot inicia uma conversa com um lead (como o caso do telefone `5545999180026`):

1. A mensagem é enviada com sucesso via Z-API
2. O status na fila fica como `sent`
3. **MAS** a mensagem não é salva na tabela `whatsapp_messages`
4. Por isso, a conversa não aparece na Caixa de Entrada

### Causa Raiz

No arquivo `supabase/functions/whatsapp-process-queue/index.ts`, linhas 217-229:

```typescript
// O INSERT não verifica erros - falha silenciosa
await supabase
  .from('whatsapp_messages')
  .insert({
    instance_name: instance.instance_name,
    message_id: zapiData.messageId || ...,
    from_number: formattedPhone,
    to_number: formattedPhone,
    message_text: msg.message,
    direction: 'outgoing',
    user_id: instance.user_id,
    tenant_id: msg.tenant_id,
    is_from_me: true  // ❌ Coluna não existe no schema!
  });
// Sem verificação de erro = falha silenciosa
```

O campo `is_from_me` não existe na tabela - isso causa erro de INSERT que é ignorado.

---

### Solução

**Arquivo:** `supabase/functions/whatsapp-process-queue/index.ts`

1. **Remover o campo inválido** `is_from_me` do INSERT
2. **Adicionar verificação de erro** no INSERT para logar falhas
3. **Incluir `agent_id`** quando disponível para rastreabilidade

**Código Corrigido:**

```typescript
// 6. Save to whatsapp_messages for history/inbox
const { error: insertError } = await supabase
  .from('whatsapp_messages')
  .insert({
    instance_name: instance.instance_name,
    message_id: zapiData.messageId || zapiData.id || zapiData.zaapId || `auto_${Date.now()}`,
    from_number: formattedPhone,
    to_number: formattedPhone,
    message_text: msg.message,
    direction: 'outgoing',
    user_id: instance.user_id,
    tenant_id: msg.tenant_id,
    agent_id: instance.agent_id || null
  });

if (insertError) {
  console.error(`[whatsapp-process-queue] ⚠️ Failed to save message to inbox:`, insertError);
} else {
  console.log(`[whatsapp-process-queue] 📥 Message saved to inbox for ${formattedPhone}`);
}
```

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Mensagem enviada mas não aparece no inbox | Mensagem enviada E aparece no inbox |
| Falha silenciosa no INSERT | Erro logado para debug |
| Sem `agent_id` | Com rastreabilidade do agente |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-process-queue/index.ts` | Corrigir INSERT removendo `is_from_me`, adicionar verificação de erro, incluir `agent_id` |

