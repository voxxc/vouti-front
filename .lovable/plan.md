

## Diagnóstico: Dois problemas distintos

### Problema 1: Mensagens de grupo estão passando pelo webhook sem filtro

A mensagem das 14:26:06 com `from_number: 5545998901121550143502` (22 dígitos, grupo "IPICASCAVEL OFICIAL") foi salva normalmente porque `isLidNumber` não detecta números de grupo que começam com `55`:

```text
isLidNumber("5545998901121550143502"):
  - includes('@lid') → false
  - length > 13 && !startsWith('55') → length=22 > 13, MAS startsWith('55')=true → false
  Resultado: false (não tratado como LID, salvo como telefone normal)
```

Banco confirma 4 mensagens com `from_number` de 15-22 dígitos (grupos) salvas nas últimas horas.

### Problema 2: Inbox não atualiza em tempo real (foco do usuário)

As mensagens **estão no banco** com `from_number` correto (`5545999180026`), mas a inbox não atualiza porque:

1. O **Realtime** (postgres_changes) substituiu o polling, mas não está disparando de forma confiável
2. O callback do Realtime chama `loadConversations()` sem `showLoading=false`, causando flickering
3. Sem polling de fallback, a inbox fica "congelada" até o próximo evento Realtime

O usuário confirma: "antes quando fazia com polling aparecia."

### Correções

**Arquivo 1: `supabase/functions/whatsapp-webhook/index.ts`**

| Mudança | Detalhe |
|---|---|
| Filtrar mensagens de grupo | No início de `handleIncomingMessage`, verificar `data.isGroup === true` e pular (não salvar no CRM). Grupos não são conversas individuais |
| Corrigir `isLidNumber` | Detectar números > 13 dígitos como inválidos, independente de começar com 55. Qualquer número > 13 dígitos é grupo ou LID |

```typescript
// isLidNumber corrigido
function isLidNumber(phone: string): boolean {
  if (phone.includes('@lid')) return true;
  const digits = phone.replace(/\D/g, '');
  // Qualquer número > 13 dígitos é LID ou grupo (telefone BR = 12-13)
  if (digits.length > 13) return true;
  return false;
}
```

```typescript
// No início de handleIncomingMessage:
async function handleIncomingMessage(data: any) {
  // Ignorar mensagens de grupo (não são conversas individuais do CRM)
  if (data.isGroup === true) {
    console.log('Skipping group message:', data.chatName || 'unknown group');
    return;
  }
  // ... resto do código
}
```

**Arquivo 2: `src/components/WhatsApp/sections/WhatsAppInbox.tsx`**

| Mudança | Detalhe |
|---|---|
| Corrigir callback Realtime | Chamar `loadConversations(false)` em vez de `loadConversations()` para evitar flickering |
| Adicionar polling de fallback (15s) | Intervalo leve para garantir que a inbox atualize mesmo quando Realtime falha |
| Polling de mensagens ativas (15s) | Para a conversa selecionada, recarregar mensagens periodicamente |

```typescript
// Callback Realtime corrigido (linha 147):
() => {
  loadConversations(false); // sem loading spinner
  loadTickets();
}

// Polling de fallback para conversas (novo):
useEffect(() => {
  if (!tenantId || myAgentId === undefined) return;
  const intervalId = setInterval(() => {
    loadConversations(false);
  }, 15000); // 15s fallback
  return () => clearInterval(intervalId);
}, [tenantId, myAgentId, loadConversations]);

// Polling de fallback para mensagens ativas (novo):
useEffect(() => {
  if (!selectedConversation || !tenantId) return;
  const intervalId = setInterval(() => {
    loadMessages(selectedConversation.contactNumber);
  }, 15000);
  return () => clearInterval(intervalId);
}, [selectedConversation, tenantId, loadMessages]);
```

**Arquivo 3: `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`**

O Super Admin já tem polling de 2s (muito agressivo). Reduzir para 15s para consistência e economia de recursos, mantendo o Realtime como mecanismo primário.

### Resultado esperado

- Mensagens de grupo serão ignoradas pelo webhook (não mais poluindo o CRM)
- Números > 13 dígitos serão detectados como LID/grupo e tratados adequadamente
- A inbox atualizará via Realtime quando funcionar, e via polling (15s) como fallback
- Sem flickering de loading spinner nas atualizações automáticas

