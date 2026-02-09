
## Plano: Atualizar Nome da Conversa Após Salvar Contato

### Problema Atual

Quando você salva um contato pela Caixa de Entrada:
1. O nome é salvo na tabela `whatsapp_contacts`
2. A lista de conversas não reflete o novo nome
3. A função `loadConversations` usa apenas o número de telefone como nome

### Solução

Duas alterações são necessárias:

---

### 1. Adicionar callback no SaveContactDialog

O `SaveContactDialog` precisa notificar o componente pai quando um contato for salvo, para que o refresh seja disparado.

**Arquivo:** `src/components/WhatsApp/components/SaveContactDialog.tsx`

- Adicionar prop `onContactSaved?: () => void`
- Chamar esse callback após salvar com sucesso

---

### 2. Modificar ContactInfoPanel para propagar o callback

**Arquivo:** `src/components/WhatsApp/components/ContactInfoPanel.tsx`

- Receber prop `onContactSaved?: () => void` do componente pai
- Passar para o `SaveContactDialog`

---

### 3. Modificar loadConversations para buscar nomes dos contatos

**Arquivos:**
- `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`

Alterar a lógica de agrupamento para:
1. Após buscar mensagens, fazer uma consulta separada à tabela `whatsapp_contacts`
2. Mapear os números de telefone para seus respectivos nomes salvos
3. Usar o nome salvo se existir, senão usar o número

```tsx
// Exemplo da nova lógica
const { data: contacts } = await supabase
  .from("whatsapp_contacts")
  .select("phone, name")
  .is("tenant_id", null); // ou .eq() para tenants

const contactNameMap = new Map(contacts?.map(c => [c.phone, c.name]) || []);

// No loop de conversas:
contactName: contactNameMap.get(number) || number,
```

---

### 4. Passar callback e forçar refresh com delay de 2 segundos

**Arquivos:**
- `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`

Passar uma função para o `ContactInfoPanel` que força o reload:

```tsx
const handleContactSaved = useCallback(() => {
  // Aguardar 2 segundos e forçar refresh
  setTimeout(() => {
    loadConversations(false);
  }, 2000);
}, [loadConversations]);

<ContactInfoPanel 
  conversation={selectedConversation}
  onContactSaved={handleContactSaved}
/>
```

---

### Fluxo Final

```
Usuário salva contato
    ↓
SaveContactDialog chama onContactSaved()
    ↓
ContactInfoPanel propaga para Inbox
    ↓
Inbox aguarda 2 segundos
    ↓
loadConversations() busca nomes da tabela whatsapp_contacts
    ↓
Nome atualizado aparece na lista de conversas
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `SaveContactDialog.tsx` | Adicionar prop `onContactSaved` e chamá-la após salvar |
| `ContactInfoPanel.tsx` | Receber e passar `onContactSaved` |
| `WhatsAppInbox.tsx` | Buscar nomes dos contatos + passar callback |
| `SuperAdminWhatsAppInbox.tsx` | Buscar nomes dos contatos + passar callback |

