
## Ajuste do Chat Interno - Scroll e Resposta a Mensagens

### Problemas Identificados

| Problema | Causa | Solução |
|----------|-------|---------|
| Interface "rasgando" | `DialogContent` sem altura fixa adequada | Definir `h-[80vh] max-h-[600px]` com `overflow-hidden` |
| Scroll não funciona | `ScrollArea` sem altura calculada | Usar `h-[calc(80vh-200px)]` para área de mensagens |
| Não há resposta a mensagem | Sem campo `reply_to_id` no banco | Adicionar coluna e UI de reply |

---

### Alterações Planejadas

#### 1. Migração de Banco de Dados

Adicionar coluna `reply_to_id` na tabela `messages`:

```text
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
```

#### 2. Corrigir Layout do InternalMessaging.tsx

**Arquivo:** `src/components/Communication/InternalMessaging.tsx`

- `DialogContent`: `className="max-w-4xl h-[80vh] max-h-[600px] p-0 overflow-hidden"`
- Container flex: `className="flex h-full overflow-hidden"`
- Lista usuários: `className="w-1/3 border-r bg-muted/20 flex flex-col h-full overflow-hidden"`
- ScrollArea usuários: `className="flex-1 overflow-hidden"`
- Área de chat: `className="flex-1 flex flex-col h-full overflow-hidden"`
- ScrollArea mensagens: `className="flex-1 overflow-auto p-4"` (com ref para auto-scroll)

#### 3. Adicionar Estado de Resposta

Novo estado no InternalMessaging:

```text
const [replyingTo, setReplyingTo] = useState<Message | null>(null);
```

#### 4. Atualizar MessageBubble.tsx

**Arquivo:** `src/components/Communication/MessageBubble.tsx`

Adicionar:
- Prop `onReply?: () => void`
- Prop `replyToContent?: string` (conteúdo da mensagem sendo respondida)
- Botão de responder (ícone Reply) que aparece no hover
- Preview da mensagem original quando for uma resposta

Visualização da mensagem com resposta:

```text
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │ ↩ Respondendo a:                    │ │
│ │ "Texto da mensagem original..."     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Nova mensagem de resposta               │
│                                  14:30  │
└─────────────────────────────────────────┘
```

#### 5. Atualizar MessageInput.tsx

**Arquivo:** `src/components/Communication/MessageInput.tsx`

Adicionar:
- Prop `replyingTo?: { id: string; content: string }`
- Prop `onCancelReply?: () => void`
- Preview acima do input mostrando mensagem sendo respondida
- Botão X para cancelar resposta

Visualização:

```text
┌─────────────────────────────────────────────────────┐
│ ↩ Respondendo a: "Texto truncado da msg..."    [X] │
├─────────────────────────────────────────────────────┤
│ [📎] [Digite sua mensagem...              ] [Send] │
└─────────────────────────────────────────────────────┘
```

#### 6. Atualizar useMessages Hook

**Arquivo:** `src/hooks/useMessages.ts`

- Adicionar `reply_to_id` na interface `Message`
- Atualizar `sendMessage` para aceitar `replyToId?: string`
- Função para buscar conteúdo da mensagem original

#### 7. Atualizar Types

**Arquivo:** `src/types/communication.ts`

```typescript
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  replyToId?: string;      // NOVO
  replyToContent?: string; // NOVO (para cache local)
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Arquivos a Modificar/Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_add_reply_to_messages.sql` | Criar | Adicionar coluna reply_to_id |
| `src/components/Communication/InternalMessaging.tsx` | Modificar | Corrigir layout + estado de reply |
| `src/components/Communication/MessageBubble.tsx` | Modificar | Adicionar botão reply + preview |
| `src/components/Communication/MessageInput.tsx` | Modificar | Preview de reply + cancelar |
| `src/hooks/useMessages.ts` | Modificar | Suportar reply_to_id |
| `src/types/communication.ts` | Modificar | Adicionar campos de reply |

---

### Resultado Esperado

1. **Scroll funcionando**: Área de mensagens com scroll suave e barra visível
2. **Layout estável**: Dialog não "rasga" independente da quantidade de mensagens
3. **Auto-scroll**: Rola automaticamente para nova mensagem
4. **Resposta visual clara**: Ao clicar em responder, aparece preview acima do input
5. **Contexto preservado**: Mensagem de resposta mostra citação da original

---

### Seção Técnica

**Cálculo de altura para ScrollArea:**

```css
/* Container do dialog */
h-[80vh] max-h-[600px]

/* Header do dialog: ~60px */
/* Header do chat: ~72px */  
/* Input area: ~80px */
/* Total fixo: ~212px */

/* Área de mensagens */
h-[calc(100%-152px)] /* 72px header + 80px input */
```

**Estrutura de dados para reply:**

```typescript
// Ao enviar mensagem com reply
{
  sender_id: currentUserId,
  receiver_id: selectedUserId,
  content: "Nova mensagem",
  reply_to_id: "uuid-da-msg-original", // NOVO
  tenant_id: tenantId
}

// Ao exibir, buscar conteúdo original
const replyContent = messages.find(m => m.id === message.reply_to_id)?.content;
```
