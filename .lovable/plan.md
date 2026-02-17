
## Ativar Etiquetas no CRM, Kanban com Cadeado, Coluna "Transferidos" e Notificacoes CRM

Este plano cobre 5 funcionalidades solicitadas:

### 1. Filtro por Etiquetas no menu "Conversas" da sidebar

**Situacao atual**: O menu "Conversas" na sidebar so tem o sub-item "Todas as Conversas".

**Mudanca**: Adicionar sub-item "Etiquetas" que, ao expandir, lista dinamicamente todas as etiquetas criadas (tabela `whatsapp_labels`). Ao clicar numa etiqueta, a lista de conversas exibe somente os leads/contatos que possuem aquela etiqueta vinculada.

- **`WhatsAppSidebar.tsx`**: Expandir o Collapsible "Conversas" com sub-botao "Etiquetas" que abre um sub-nivel com as etiquetas carregadas do banco. Ao clicar numa etiqueta, navega para uma nova section `label-filter` passando o `labelId`.
- **`WhatsAppDrawer.tsx`**: Adicionar nova section `label-filter` ao tipo `WhatsAppSection`. Renderizar um componente `WhatsAppLabelConversations` que recebe o `labelId`.
- **Novo componente `WhatsAppLabelConversations.tsx`**: Busca contatos vinculados aquela etiqueta via `whatsapp_contact_labels` JOIN `whatsapp_contacts`, depois busca as conversas desses telefones na `whatsapp_messages`. Reutiliza `ConversationList` e `ChatPanel`.

### 2. Coluna "Transferidos" no Kanban de cada agente

**Mudanca no banco**: Adicionar colunas `transferred_from_agent_id` e `transferred_from_agent_name` na tabela `whatsapp_conversation_kanban` para rastrear o agente anterior.

**Migracao SQL**:
```sql
ALTER TABLE whatsapp_conversation_kanban 
  ADD COLUMN transferred_from_agent_id uuid REFERENCES whatsapp_agents(id),
  ADD COLUMN transferred_from_agent_name text;
```

- **`TransferConversationDialog.tsx`**: Ao transferir/atribuir, gravar o `transferred_from_agent_id` e `transferred_from_agent_name` no card Kanban do agente destino.
- **`ContactInfoPanel.tsx`**: Na secao "Kanban CRM" do painel lateral, exibir "Transferido de: [nome do agente anterior]" quando o campo `transferred_from_agent_name` estiver preenchido.
- **Kanban visual (`WhatsAppKanban.tsx`)**: Nos cards que tem `transferred_from_agent_name`, exibir um badge "De: [nome]" para rastreio visual.

### 3. Cadeado para travar/destravar drag-and-drop de colunas no Kanban CRM

**Situacao atual**: O Kanban do CRM permite arrastar cards entre colunas, mas nao tem controle de trava como o Kanban de projetos (`ProjectView.tsx` usa `isColumnsLocked` com icone Lock/LockOpen).

**Mudanca**: Adicionar botao de cadeado no header do Kanban CRM:
- Estado `isLocked = true` (padrao): permite arrastar **cards** entre colunas normalmente.
- Estado `isLocked = false`: os cards ficam travados (nao arrastam). Isso protege contra movimentacoes acidentais.

O padrao e o inverso do projeto (aqui trava os cards, nao colunas, ja que colunas do CRM sao fixas). Mas o visual sera o mesmo: botao circular com Lock/LockOpen.

- **`WhatsAppKanban.tsx`**: Adicionar estado `isLocked`, botao no header, e `isDragDisabled={isLocked}` nos `Draggable`.

### 4. Sino de notificacoes no CRM

**Mudanca**: Adicionar icone de sino no header do CRM (sidebar ou area principal) que mostra notificacoes especificas do CRM. Usa a tabela `notifications` existente filtrando por `type` com valores CRM-especificos (ex: `conversation_transferred`, `crm_label_added`, `crm_new_lead`).

- **Novo componente `CRMNotificationsBell.tsx`**: Icone de sino com badge de contagem de nao-lidos. Ao clicar, abre um Popover com lista das notificacoes CRM recentes. Marca como lidas ao abrir.
- **`WhatsAppSidebar.tsx`** ou **`WhatsAppLayout.tsx`**: Posicionar o sino no header do CRM, proximo ao logo.
- Filtra notificacoes por `type IN ('conversation_transferred', 'crm_new_lead', ...)` e `tenant_id`.

### 5. Garantir que etiquetas funcionem end-to-end

A tabela `whatsapp_contact_labels` **nao tem** coluna `tenant_id`, porem o `AddLabelDropdown` tenta inserir com `tenant_id`. Isso precisa ser corrigido:

**Migracao SQL**:
```sql
ALTER TABLE whatsapp_contact_labels ADD COLUMN tenant_id uuid REFERENCES tenants(id);
```

---

### Resumo dos arquivos a editar/criar

| Arquivo | Acao |
|---|---|
| **Migracao SQL** | Adicionar `tenant_id` em `whatsapp_contact_labels`, adicionar `transferred_from_agent_id/name` em `whatsapp_conversation_kanban` |
| `WhatsAppSidebar.tsx` | Expandir menu Conversas com sub-nivel Etiquetas |
| `WhatsAppDrawer.tsx` | Nova section `label-filter`, state para `selectedLabelId` |
| **Novo: `WhatsAppLabelConversations.tsx`** | Componente para listar conversas filtradas por etiqueta |
| `WhatsAppKanban.tsx` | Botao cadeado Lock/LockOpen, `isDragDisabled` nos Draggable |
| `TransferConversationDialog.tsx` | Gravar `transferred_from_agent_id/name` ao transferir |
| `ContactInfoPanel.tsx` | Exibir "Transferido de" no painel lateral |
| **Novo: `CRMNotificationsBell.tsx`** | Sino com notificacoes CRM |
| `WhatsAppSidebar.tsx` ou header | Posicionar sino |
