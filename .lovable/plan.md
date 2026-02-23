
## Adicionar aba "Arquivados" na Caixa de Entrada do WhatsApp

### O que muda

Uma nova aba com icone de arquivo sera adicionada na barra de abas da lista de conversas (ao lado de Abertas, Fila, Grupos e Encerrados). Conversas arquivadas ficam separadas e podem ser desarquivadas.

### Como funciona

- **Arquivar**: O ticket recebe status `"archived"` (novo valor de status na tabela `whatsapp_tickets`).
- **Desarquivar**: Muda o status de volta para `"waiting"` (volta para a Fila).
- Conversas arquivadas nao aparecem nas outras abas.
- O botao de arquivar ficara disponivel no `ChatPanel` (header da conversa) quando o ticket estiver aberto ou encerrado.

### Alteracoes

**1. Banco de dados** -- Nenhuma migracao necessaria
A coluna `status` na tabela `whatsapp_tickets` e do tipo `text`, entao ja aceita o valor `"archived"` sem alteracoes de schema.

**2. `src/components/WhatsApp/components/ConversationList.tsx`**

- Adicionar `"archived"` ao tipo `ConversationTab`
- Adicionar nova entrada no array `TABS` com icone `Archive` e label "Arquivados"
- Atualizar `tabCounts` para incluir `archived: number`

**3. `src/components/WhatsApp/sections/WhatsAppInbox.tsx`**

- Atualizar `getFilteredConversations()` com novo case para `activeTab === "archived"`: filtrar conversas cujo ticket tem `status === "archived"`
- Atualizar `getTabCounts()` para contar conversas arquivadas
- Adicionar funcao `handleArchiveTicket`: atualiza o ticket para `status: "archived"`
- Adicionar funcao `handleUnarchiveTicket`: atualiza o ticket para `status: "waiting"`
- Passar as funcoes de arquivar/desarquivar para o `ChatPanel`

**4. `src/components/WhatsApp/components/ChatPanel.tsx`**

- Receber props `onArchiveTicket` e `onUnarchiveTicket`
- Adicionar botao de arquivar (icone Archive) no header da conversa, visivel quando o ticket nao esta arquivado
- Adicionar botao de desarquivar quando visualizando conversa da aba "Arquivados"

### Fluxo do usuario

1. O agente abre uma conversa na aba "Abertas" ou "Encerrados"
2. Clica no botao de arquivar no header do chat
3. A conversa move para a aba "Arquivados"
4. Na aba "Arquivados", o agente pode desarquivar e a conversa volta para "Fila"

### Logica de exclusao entre abas

As conversas arquivadas serao excluidas das abas "Abertas", "Fila" e "Encerrados" adicionando a condicao `ticket.status !== "archived"` nos filtros existentes.
