

## Plano: Correção do Polling de 2 Segundos na Caixa de Entrada

### Problema Identificado

As funções `loadConversations` e `loadMessages` são declaradas como funções regulares dentro do componente, causando:
- **Closure obsoleta**: Os `useEffect` de polling capturam versões antigas das funções
- **Dependências incompletas**: O ESLint/React não rastreia corretamente as dependências
- **Inconsistência**: O polling pode não buscar dados atualizados corretamente

### Solução

Refatorar ambos os componentes (`WhatsAppInbox.tsx` e `SuperAdminWhatsAppInbox.tsx`) para usar `useCallback` nas funções de carregamento e adicionar as dependências corretas nos `useEffect`.

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Refatorar com `useCallback` |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx` | Refatorar com `useCallback` |

---

### Mudanças Detalhadas

#### 1. WhatsAppInbox.tsx (Tenant)

```typescript
// ANTES: Funções simples
const loadConversations = async (showLoading = true) => { ... }
const loadMessages = async (contactNumber: string) => { ... }

// DEPOIS: Usar useCallback para estabilizar referências
const loadConversations = useCallback(async (showLoading = true) => {
  if (!tenantId) return;
  // ... lógica existente
}, [tenantId]);

const loadMessages = useCallback(async (contactNumber: string) => {
  if (!tenantId) return;
  // ... lógica existente
}, [tenantId]);
```

#### 2. Atualizar dependências dos useEffect

```typescript
// Polling de conversas - ADICIONAR loadConversations nas dependências
useEffect(() => {
  if (!tenantId) return;
  const intervalId = setInterval(() => {
    loadConversations(false);
  }, 2000);
  return () => clearInterval(intervalId);
}, [tenantId, loadConversations]); // ← Adicionar dependência

// Polling de mensagens - ADICIONAR loadMessages nas dependências
useEffect(() => {
  if (!selectedConversation || !tenantId) return;
  const intervalId = setInterval(() => {
    loadMessages(selectedConversation.contactNumber);
  }, 2000);
  return () => clearInterval(intervalId);
}, [selectedConversation, tenantId, loadMessages]); // ← Adicionar dependência
```

#### 3. Aplicar mesma lógica no SuperAdminWhatsAppInbox.tsx

Mesma refatoração, mas sem a dependência de `tenantId` (Super Admin não usa tenant).

---

### Ordem Final dos Hooks (Importante)

A ordem correta será:

1. **Estados** (`useState`)
2. **Funções com `useCallback`** (loadConversations, loadMessages)
3. **useEffect de carregamento inicial + real-time**
4. **useEffect de polling**

Isso garante que as funções estejam definidas antes de serem usadas nos `useEffect`.

---

### Resultado Esperado

- **Polling funcionando corretamente**: A cada 2 segundos, busca novas mensagens
- **Sem closures obsoletas**: As funções sempre terão acesso aos valores atualizados
- **Atualização em tempo real**: Mensagens de leads aparecerão automaticamente na caixa de entrada

---

### Detalhes Técnicos

**Imports necessários:**
```typescript
import { useState, useEffect, useCallback } from "react";
```

**Estrutura refatorada do componente:**
```text
WhatsAppInbox
├── useState (conversations, selectedConversation, messages, isLoading)
├── useCallback: loadConversations(showLoading)
├── useCallback: loadMessages(contactNumber)
├── useEffect: Carregamento inicial + real-time subscription (depende de tenantId)
├── useEffect: Real-time subscription para mensagens (depende de selectedConversation, tenantId)
├── useEffect: Polling conversas 2s (depende de tenantId, loadConversations)
├── useEffect: Polling mensagens 2s (depende de selectedConversation, tenantId, loadMessages)
└── handleSendMessage + render
```

