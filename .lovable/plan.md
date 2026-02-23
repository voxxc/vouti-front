

## Ajustes no CRM WhatsApp - 6 Itens

### 1. Remover labels das abas (somente icones)

**Arquivo:** `src/components/WhatsApp/components/ConversationList.tsx`

- Remover `<span className="hidden sm:inline">{tab.label}</span>` da linha 150
- Manter apenas o icone e o badge de contagem

### 2. Fundo verde suave na area de mensagens (modo claro)

**Arquivo:** `src/components/WhatsApp/components/ChatPanel.tsx`

- Na `ScrollArea` de mensagens (linha 370), adicionar um background verde bem suave
- Usar `bg-green-50/40 dark:bg-transparent` (verde suavissimo no light mode, sem mudanca no dark)
- Manter o pattern SVG existente por cima

### 3. Tela de boas-vindas com logo ao trocar de aba

**Arquivo:** `src/components/WhatsApp/components/ChatPanel.tsx`

- Quando `conversation` e `null`, trocar a tela atual (icone generico + "WhatsApp Web") por:
  - Logo "vouti" com ponto vermelho (reutilizar `LogoVouti`)
  - Subtitulo ".crm" ao lado
  - Slogan: "O melhor lugar para seu trabalho."
  - Design centralizado, clean

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

- Ao trocar de aba (`onTabChange`), resetar `selectedConversation` para `null`
  - Isso faz o ChatPanel mostrar a tela de boas-vindas automaticamente
  - O usuario clica em uma conversa da nova aba para abri-la

### 4. Conversas transferidas aparecem na Fila de Espera

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

- Ao carregar conversas, verificar na tabela `whatsapp_conversation_kanban` se ha cards na coluna "Transferidos" para o agente atual
- Essas conversas devem aparecer na aba "Fila de Espera" com status "waiting"
- Criar ticket "waiting" automaticamente para conversas transferidas que nao tenham ticket ainda
- Ao aceitar, o ticket muda para "open" e a conversa vai para "Abertas"

### 5. Botoes Aceitar/Encerrar sempre visiveis no header

**Arquivo:** `src/components/WhatsApp/components/ChatPanel.tsx`

- O ChatPanel ja recebe `ticketStatus`, `onAcceptTicket`, `onCloseTicket` como props (linhas 353-362)
- Problema: os botoes so aparecem condicionalmente. Ajustar para:
  - **Aceitar** (CheckCircle verde): visivel quando `ticketStatus === "waiting"` OU quando nao ha ticket (conversa nova)
  - **Encerrar** (XCircle vermelho): visivel quando `ticketStatus === "open"`
  - Ambos devem estar sempre presentes no header (um ou outro, nunca os dois ao mesmo tempo)
  - Manter o botao de tres pontinhos (MoreVertical)

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

- Garantir que `ticketStatus` e passado corretamente para o ChatPanel mesmo para conversas sem ticket (tratar como "waiting")

### 6. Aba Grupos: botao "Buscar Grupos" interno + persistencia

**Arquivo:** `src/components/WhatsApp/components/ConversationList.tsx`

- Quando `activeTab === "groups"`, exibir um botao "Buscar Grupos" no topo da lista (antes dos cards)
- Ao clicar, chamar `onFetchGroups` (ja existente, invoca edge function `whatsapp-list-groups`)
- Os grupos buscados devem ser salvos na tabela `whatsapp_contacts` (ou nova tabela) para persistir
- Permitir ao usuario editar/salvar um nome customizado para cada grupo
- Exibir os grupos salvos mesmo sem clicar "Buscar" novamente

**Persistencia de grupos:**
- Ao buscar grupos, salvar na `whatsapp_contacts` com o campo `phone` = group JID (contendo `@g.us`)
- Usar o campo `name` para o nome customizado
- Na proxima abertura, carregar grupos ja salvos da `whatsapp_contacts`

### Detalhes tecnicos - Resumo de arquivos

1. `ConversationList.tsx` -- remover labels, adicionar botao "Buscar Grupos" na aba grupos
2. `ChatPanel.tsx` -- fundo verde suave, tela boas-vindas com logo Vouti.CRM, ajustar visibilidade botoes aceitar/encerrar
3. `WhatsAppInbox.tsx` -- resetar conversa ao trocar aba, incluir transferidos na fila, ajustar ticketStatus default

Nao ha necessidade de migracao SQL pois os grupos podem ser persistidos na tabela `whatsapp_contacts` ja existente.
