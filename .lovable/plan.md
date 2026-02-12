
## Revisao completa: IA por agente, Kanban drag-and-drop e navegacao

### 1. IA individual por agente (nao por tenant)

**Problema atual**: A tabela `whatsapp_ai_config` tem apenas `tenant_id` como chave. Todos os agentes de um mesmo tenant compartilham a MESMA configuracao de IA (mesmo nome, mesmo prompt, mesmo modelo). O usuario quer que cada agente tenha sua propria IA.

**Solucao**:
- Adicionar coluna `agent_id` (UUID, FK para `whatsapp_agents`) na tabela `whatsapp_ai_config`
- Criar indice unico parcial: `(agent_id)` quando `agent_id IS NOT NULL`, e `(tenant_id)` quando `agent_id IS NULL` (fallback)
- Atualizar o webhook para buscar config IA pelo `agent_id` da instancia (com fallback para tenant se nao encontrar)
- Atualizar o `whatsapp-ai-chat` para receber `agent_id` e buscar config especifica
- Atualizar o `whatsapp-ai-debounce` para propagar `agent_id` na chamada ao `whatsapp-ai-chat`
- Atualizar a UI `WhatsAppAISettings.tsx` para salvar com `agent_id` quando editando dentro de um agente

**Arquivos**:

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Adicionar coluna `agent_id`, indices, vincular configs existentes |
| `supabase/functions/whatsapp-webhook/index.ts` | Buscar `whatsapp_ai_config` por `agent_id` primeiro, fallback para `tenant_id` |
| `supabase/functions/whatsapp-ai-chat/index.ts` | Receber `agent_id`, buscar config por agente |
| `supabase/functions/whatsapp-ai-debounce/index.ts` | Passar `agent_id` na chamada ao `whatsapp-ai-chat` |
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Salvar e carregar config por `agent_id` |

### 2. Kanban drag-and-drop com movimentacao errada

**Problema**: Ao arrastar um card para uma coluna, ele vai para outra coluna antes de ir para a correta. Isso acontece porque o polling de 2 segundos sobrescreve o estado local durante/apos o drag. Embora `isDraggingRef` exista, o problema e que o `handleDragEnd` faz update otimista mas o polling pode rodar entre o update otimista e a conclusao do update no banco.

**Solucao**:
- Adicionar um "cooldown" apos o drag-end: manter `isDraggingRef.current = true` por 3 segundos apos o drop para impedir o polling de sobrescrever
- Garantir que o update otimista local seja estavel durante esse periodo

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

### 3. Clicar no card do Kanban abre a conversa na Caixa de Entrada

**Problema**: Atualmente, clicar no card abre um chat inline no Kanban. O usuario quer que ao clicar, saia do Kanban e abra a Caixa de Entrada com a conversa selecionada.

**Solucao**:
- Adicionar callback `onOpenConversation` no `WhatsAppKanban` que passa o telefone/conversa para o layout
- No `WhatsAppLayout`, receber esse callback, trocar para a secao "inbox" e passar o telefone para pre-selecionar
- No `WhatsAppInbox`, aceitar uma prop `initialConversationPhone` para auto-selecionar a conversa ao montar
- Remover o chat inline do Kanban (ChatPanel + ContactInfoPanel integrados)

**Arquivos**:

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Remover chat inline, adicionar callback `onOpenConversation` |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Passar callback e estado de conversa selecionada |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Aceitar `initialConversationPhone` prop |

### 4. Revisao geral do fluxo de mensagens

**Verificacoes e correcoes**:

a) **Mensagem enviada pelo agente** - Ja funciona: `whatsapp-send-message` salva com `agent_id`, aparece no chat via polling 2s.

b) **Lead responde** - Ja funciona: webhook resolve `agent_id` da instancia e salva no insert. Aparece no chat via polling.

c) **IA responde** - Sera corrigido no item 1: buscar config por `agent_id`, manter `agent_id` no fluxo inteiro (webhook -> debounce -> ai-chat -> saveOutgoingMessage).

d) **Human takeover** - Ja funciona: `whatsapp_ai_disabled_contacts` desativa IA para contato especifico. Botao existente na UI.

### Sequencia de implementacao

1. Migracao SQL (adicionar `agent_id` em `whatsapp_ai_config`, vincular dados existentes)
2. Edge Functions (webhook, ai-chat, ai-debounce) - buscar config por agente
3. UI do AI Settings - salvar por agente
4. Kanban - fix drag-and-drop cooldown
5. Kanban -> Inbox navegacao
6. Deploy e teste
