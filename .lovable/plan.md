

## Vouti.Bot: Kanban CRM Avancado + Inbox por Agente

Este plano cobre 3 grandes mudancas no Vouti.Bot:

1. **Admin so tem Caixa de Entrada se criar um Agente para si**
2. **Kanban automatico ao criar agente (com colunas padronizadas)**
3. **Cards do Kanban com visual rico (conforme referencia) + abertura do chat ao clicar**

---

### 1. Colunas padrao do Kanban -- Atualizar trigger

A funcao `create_default_kanban_columns` atualmente cria 5 colunas: Novo Lead, Em Contato, Negociando, Fechado, Perdido.

Sera atualizada para criar as 10 colunas solicitadas:

| Ordem | Nome | Cor |
|-------|------|-----|
| 0 | Topo de Funil | #3b82f6 (azul) |
| 1 | 1° Contato | #f59e0b (amarelo) |
| 2 | 2° Contato | #f97316 (laranja) |
| 3 | 3° Contato | #ef4444 (vermelho) |
| 4 | 4° Contato | #ec4899 (pink) |
| 5 | Reuniao Agendada | #8b5cf6 (roxo) |
| 6 | Proposta Enviada | #6366f1 (indigo) |
| 7 | Sem Retorno | #6b7280 (cinza) |
| 8 | Desqualificado | #991b1b (vermelho escuro) |
| 9 | Fechado | #22c55e (verde) |

**Migracao SQL**: Alterar funcao + deletar colunas antigas de agentes que ainda usam as 5 padrao e recriar com as 10 novas.

---

### 2. Inbox filtrada por agent_id do admin

**Comportamento atual**: A `WhatsAppInbox` carrega todas as mensagens do tenant, sem filtrar por agente.

**Novo comportamento**:
- Se o usuario logado tem um agente vinculado (via email na tabela `whatsapp_agents`), a Caixa de Entrada filtra mensagens por `agent_id` desse agente
- Se o usuario nao tem agente, a Caixa de Entrada mostra uma mensagem: "Crie um Agente para si em Configuracoes > Agentes para receber mensagens aqui"
- Admin continua acessando "Todas as Conversas" sem filtro

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- Adicionar busca do `agent_id` do usuario logado (por email)
- Se encontrou agente, filtrar `whatsapp_messages` por `.eq("agent_id", agentId)`
- Se nao encontrou, mostrar estado vazio com instrucao

---

### 3. Novas conversas caem automaticamente no "Topo de Funil"

**Logica**: Quando uma nova conversa aparece na Caixa de Entrada (nova mensagem de numero inedito), ela deve ser inserida automaticamente na tabela `whatsapp_conversation_kanban` com a `column_id` da coluna "Topo de Funil" (column_order = 0) do agente correspondente.

**Implementacao**: Adicionar logica no webhook de mensagens (ou na inbox ao detectar novo contato) que faz upsert no `whatsapp_conversation_kanban` apontando para a primeira coluna do agente.

**Arquivo afetado**: `src/components/WhatsApp/sections/WhatsAppInbox.tsx` -- ao carregar conversas, verificar se cada numero ja existe no kanban; se nao, inserir no "Topo de Funil".

---

### 4. Cards do Kanban com visual rico (conforme imagem de referencia)

Baseado na imagem enviada, cada card tera:

- **Titulo** (ex: "Item Sem Titulo" ou nome do contato) -- editavel futuramente
- **Agente responsavel + badge de status** (ex: "IA daniel - grupo solvenza #1727" + "Aberto")
- **Ultima mensagem** (preview truncado)
- **Avatar do contato** (iniciais com cor)
- **Nome do contato** em destaque
- **Tempo desde a ultima mensagem** (ex: "8HR29MIN", "13DAY14HR10MIN")

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`
- Redesenhar o componente de card para incluir esses elementos
- Buscar dados adicionais: nome do agente, nome salvo do contato, timestamp da ultima mensagem
- Calcular tempo relativo (dias/horas/minutos)

---

### 5. Clicar no card do Kanban abre o chat

Ao clicar em um card no Kanban, abrir o mesmo painel de chat que abre ao clicar em uma conversa na Caixa de Entrada.

**Implementacao**:
- Adicionar estado `selectedPhone` no `WhatsAppKanban`
- Ao clicar no card, setar o telefone selecionado
- Renderizar o `ChatPanel` + `ContactInfoPanel` (mesmos componentes usados na Inbox) ao lado do board
- O board ficara em modo compacto quando o chat estiver aberto

---

### 6. Botao "Criar meu Agente" para Admin

Na pagina de Agentes (`WhatsAppAgentsSettings`), adicionar um botao diferenciado no topo:
- **"Criar Meu Agente"** -- visivel apenas se o admin logado ainda nao tem um agente com seu email
- Ao clicar, cria automaticamente um agente com o email e nome do admin, role "admin"
- Isso desbloqueia a Caixa de Entrada e o Kanban pessoal do admin

**Arquivo**: `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`

---

### Secao Tecnica -- Arquivos e Migracoes

| Arquivo | Acao |
|---|---|
| Migracao SQL | Atualizar `create_default_kanban_columns` com 10 colunas; recriar colunas default existentes |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Filtrar por agent_id; auto-inserir novos contatos no kanban "Topo de Funil" |
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Redesenhar cards com visual rico; adicionar chat inline ao clicar; buscar dados enriquecidos |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Botao "Criar Meu Agente" para admin |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Kanban do admin aparece apos criar agente |

### Sequencia de implementacao

1. Migracao SQL (colunas padrao do kanban)
2. Botao "Criar Meu Agente" no painel de agentes
3. Inbox filtrada por agent_id
4. Auto-inserir novos contatos no Topo de Funil
5. Cards visuais ricos no Kanban
6. Chat inline ao clicar no card do Kanban

