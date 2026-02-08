
# Plano: Polling Automático de 2 Segundos na Caixa de Entrada WhatsApp

## Objetivo
Implementar atualização automática em segundo plano a cada 2 segundos para a página da Caixa de Entrada do WhatsApp, garantindo que mensagens e conversas estejam sempre sincronizadas.

## Implementação Atual

O componente já possui:
- Real-time via Supabase para detectar INSERT
- Carregamento inicial de conversas e mensagens

## Solução Proposta

Adicionar um **useEffect com setInterval** para polling complementar ao real-time:

### Alterações em `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

#### 1. Novo useEffect para Polling de Conversas (a cada 2 segundos)

```typescript
// Polling automático para atualizar conversas a cada 2 segundos
useEffect(() => {
  if (!tenantId) return;

  const intervalId = setInterval(() => {
    loadConversations();
  }, 2000); // 2 segundos

  return () => {
    clearInterval(intervalId);
  };
}, [tenantId]);
```

#### 2. Novo useEffect para Polling de Mensagens da Conversa Ativa

```typescript
// Polling automático para atualizar mensagens da conversa ativa a cada 2 segundos
useEffect(() => {
  if (!selectedConversation || !tenantId) return;

  const intervalId = setInterval(() => {
    loadMessages(selectedConversation.contactNumber);
  }, 2000); // 2 segundos

  return () => {
    clearInterval(intervalId);
  };
}, [selectedConversation, tenantId]);
```

#### 3. Remover `setIsLoading(true)` do Polling

Para evitar flickering visual durante o polling, modificar `loadConversations`:

```typescript
const loadConversations = async (showLoading = true) => {
  if (!tenantId) return;
  
  if (showLoading) setIsLoading(true);
  try {
    // ... fetch data
  } finally {
    if (showLoading) setIsLoading(false);
  }
};
```

E no polling, chamar `loadConversations(false)` para não exibir loading.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Adicionar useEffect com setInterval para polling de conversas e mensagens |

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Inbox Page                       │
├─────────────────────────────────────────────────────────────┤
│  ATUALIZAÇÃO REAL-TIME (Supabase Realtime)                  │
│  └─ Detecta INSERT instantaneamente                          │
│                                                              │
│  ATUALIZAÇÃO POR POLLING (Backup a cada 2 seg)              │
│  └─ Garante sincronização mesmo se real-time falhar          │
│  └─ Atualiza lista de conversas                              │
│  └─ Atualiza mensagens da conversa ativa                     │
│                                                              │
│  CLEANUP                                                     │
│  └─ clearInterval ao sair da página                          │
│  └─ removeChannel das subscriptions                          │
└─────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

1. Página atualiza automaticamente a cada 2 segundos
2. Novas mensagens aparecem mesmo se real-time estiver instável
3. Lista de conversas sempre sincronizada
4. Sem flickering visual durante polling (loading oculto)
5. Cleanup adequado ao sair da página para evitar memory leaks
