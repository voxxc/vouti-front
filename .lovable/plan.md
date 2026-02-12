

## Separar Nome do Agente (humano) e Nome do Agente IA nas mensagens

### Resumo

Atualmente, o campo `name` na tabela `whatsapp_agents` armazena o nome completo (ex: "Daniel Pereira de Morais"), mas o usuario quer poder definir um **nome de exibicao** diferente para quando o agente humano envia mensagens pelo CRM. Alem disso, o **Nome do Agente IA** (configurado em "Comportamento da IA") deve funcionar como prefixo das respostas automaticas da IA, e se estiver vazio, a IA responde sem nome.

### O que muda

1. **Campo editavel de nome no card do agente** - Adicionar um input para alterar o nome do agente diretamente no card expandido (aba Z-API ou acima das abas). Esse nome sera usado como prefixo `*NOME*` nas mensagens enviadas pelo humano via CRM.

2. **Nome do Agente IA prefixado nas respostas automaticas** - O debounce (`whatsapp-ai-debounce`) deve usar o `agent_name` retornado pelo `whatsapp-ai-chat` para prefixar a resposta da IA com `*NOME_IA*\n\n`. Se `agent_name` estiver vazio/null, envia apenas o texto sem prefixo.

### Mudancas tecnicas

**Arquivo 1**: `src/components/WhatsApp/settings/AgentCard.tsx`
- Sem mudancas (o nome ja aparece no card)

**Arquivo 2**: `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`
- Adicionar um campo Input editavel para o nome do agente dentro da area expandida (acima das abas ou no topo)
- Botao de salvar que faz UPDATE na tabela `whatsapp_agents` no campo `name`
- Ao salvar, atualizar o estado local `agents` para refletir a mudanca no card

**Arquivo 3**: `supabase/functions/whatsapp-ai-debounce/index.ts`
- Apos receber `aiData.response` e `aiData.agent_name` do chat, prefixar a mensagem:
  ```
  const aiAgentName = aiData.agent_name;
  const prefixedResponse = aiAgentName 
    ? `*${aiAgentName}*\n\n${aiData.response}` 
    : aiData.response;
  ```
- Usar `prefixedResponse` tanto no `saveOutgoingMessage` quanto no envio via Z-API

**Arquivo 4**: `supabase/functions/whatsapp-ai-chat/index.ts`
- Sem mudancas (ja retorna `agent_name` no response)

**Arquivo 5**: `src/components/WhatsApp/settings/WhatsAppAISettings.tsx`
- Sem mudancas estruturais. O campo "Nome do Agente" ja existe e sera clarificado como o nome da IA nas respostas automaticas.

### Fluxo resultante

| Quem envia | Prefixo da mensagem | Onde configura |
|---|---|---|
| Agente humano (CRM/Inbox) | `*Nome do Agente*` (campo `name` da tabela `whatsapp_agents`) | Card do agente expandido |
| Agente IA (automatico) | `*Nome do Agente IA*` (campo `agent_name` da tabela `whatsapp_ai_config`) | Aba "Comportamento da IA" |
| Agente IA sem nome configurado | Sem prefixo, apenas texto | Deixar campo vazio na aba IA |

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Campo editavel para nome do agente no card expandido |
| `supabase/functions/whatsapp-ai-debounce/index.ts` | Prefixar resposta da IA com nome do agente IA |

