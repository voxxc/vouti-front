

## Melhorias na aba Contatos + Adicionar Card no Kanban

### 1. Aba Contatos -- novos botoes

**Arquivo: `src/components/WhatsApp/sections/WhatsAppContacts.tsx`**

Duas novas funcionalidades:

**a) Botao "Novo Contato" no header**
- Ao lado do badge de contagem, um botao "Novo Contato" abre o `SaveContactDialog` com o campo telefone editavel (hoje ele vem desabilitado). Para isso, o `SaveContactDialog` recebera uma nova prop `allowPhoneEdit` que, quando `true`, permite digitar o telefone.

**b) Botao "Enviar Mensagem" no menu de acoes de cada contato**
- No `DropdownMenu` de cada contato (onde ja tem Editar e Excluir), adicionar a opcao "Enviar Mensagem".
- O componente `WhatsAppContacts` recebera uma prop callback `onStartConversation(phone: string, contactName: string)` que sera chamada ao clicar.
- O componente pai (sidebar/drawer) tratara esse callback navegando para a Caixa de Entrada e abrindo a conversa com aquele contato.

---

### 2. SaveContactDialog -- campo telefone editavel

**Arquivo: `src/components/WhatsApp/components/SaveContactDialog.tsx`**

- Nova prop opcional `allowPhoneEdit?: boolean` (default `false` para manter compatibilidade).
- Quando `true`, o campo telefone deixa de ser `disabled` e o usuario pode digitar o numero.
- O estado interno `phoneValue` sera usado em vez do prop fixo.

---

### 3. Kanban -- botao "Adicionar Card"

**Arquivo: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`**

No header do Kanban, ao lado do titulo, um botao "+" (Adicionar Card) abre um Dialog (`AddKanbanCardDialog`).

**Novo componente: `src/components/WhatsApp/components/AddKanbanCardDialog.tsx`**

O dialog tera duas abas (ou dois modos):

**Aba 1 -- "Conversas Existentes"**
- Lista as conversas da Caixa de Entrada do agente que ainda nao estao no Kanban.
- O usuario seleciona uma ou mais conversas e clica "Adicionar".
- Cada conversa selecionada e inserida no Kanban na coluna "Topo de Funil".

**Aba 2 -- "Novo Contato"**
- Formulario rapido: Telefone, Nome, Email (opcional), Observacoes (opcional).
- Ao salvar:
  1. Cria o contato na tabela `whatsapp_contacts`.
  2. Insere o card no Kanban na coluna "Topo de Funil" com o telefone do novo contato.
- O contato aparecera automaticamente na aba Contatos.

---

### Detalhes tecnicos

**AddKanbanCardDialog** -- logica principal:

```typescript
// Aba "Conversas Existentes":
// 1. Buscar conversas do agente (whatsapp_messages com agent_id)
// 2. Buscar cards existentes no kanban (whatsapp_conversation_kanban com agent_id)
// 3. Filtrar: mostrar apenas conversas que NAO tem card no kanban
// 4. Ao selecionar e confirmar:
await supabase.from("whatsapp_conversation_kanban").insert({
  tenant_id, agent_id, phone, column_id: firstColumnId, card_order: 0
});

// Aba "Novo Contato":
// 1. Salvar em whatsapp_contacts
await supabase.from("whatsapp_contacts").insert({
  tenant_id, phone, name, email, notes, created_by
});
// 2. Inserir card no kanban
await supabase.from("whatsapp_conversation_kanban").insert({
  tenant_id, agent_id, phone, column_id: firstColumnId, card_order: 0
});
```

**WhatsAppContacts** -- prop de navegacao:

O componente `WhatsAppContacts` nao gerencia navegacao sozinho. Ele recebera o callback `onStartConversation` do componente pai (`WhatsAppSidebar` ou equivalente) que alternara a view para a Inbox com a conversa selecionada.

---

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppContacts.tsx` | Botao "Novo Contato" + opcao "Enviar Mensagem" no dropdown + prop `onStartConversation` |
| `src/components/WhatsApp/components/SaveContactDialog.tsx` | Nova prop `allowPhoneEdit` para permitir digitar o telefone |
| `src/components/WhatsApp/components/AddKanbanCardDialog.tsx` | **Novo** -- Dialog com abas para adicionar card de conversa existente ou criar novo contato |
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Botao "+" no header que abre o `AddKanbanCardDialog` |

