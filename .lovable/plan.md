
## Ajustes no CRM WhatsApp - 9 Itens

### 1. Corrigir Logo na Tela de Boas-Vindas

**Arquivo:** `src/components/WhatsApp/components/ChatPanel.tsx` (linhas 355-370)

**Problema:** A logo no centro da tela (quando nenhuma conversa esta selecionada) esta renderizada inline com HTML/CSS customizado em vez de usar o componente do header.

**Solucao:** Manter o estilo atual mas garantir que reproduza exatamente o formato do header `CRMTopbar.tsx` (linha 53-56):
- Texto "vouti" + ponto vermelho + "crm" tudo junto, sem ".crm" separado
- Formato: `vouti.crm` (o ponto vermelho faz parte, "crm" colado)
- Usar `text-3xl` como no header (nao `text-5xl`)
- Manter slogan abaixo

### 2. Persistencia de Grupos Buscados

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
**Arquivo:** `src/components/WhatsApp/components/ConversationList.tsx`

**Problema:** Grupos buscados nao ficam salvos e desaparecem ao recarregar.

**Solucao:**
- Ao buscar grupos via Z-API/edge function, salvar cada grupo na tabela `whatsapp_contacts` com:
  - `phone` = group JID (ex: `123456@g.us`)
  - `name` = nome do grupo
  - `tenant_id` = tenant atual
  - Novo campo ou tag indicando que e grupo
- Na aba "Grupos", carregar da `whatsapp_contacts` onde phone contém `@g.us` + tenant_id
- Todos os agentes do mesmo tenant verao os mesmos grupos

### 3. Fix Macros nao Aparecendo no Painel de Contato

**Arquivo:** `src/components/WhatsApp/components/ContactInfoPanel.tsx` (linha 106)

**Problema:** O polling busca `"id, name, shortcut, content"` mas a coluna no banco se chama `message_template` (nao `content`). Resultado: dados voltam sem o campo correto.

**Solucao:** Trocar `.select("id, name, shortcut, content")` por `.select("id, name, shortcut, message_template")`

### 4. Horario de Inicio em Campanhas

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppCampaigns.tsx`

**Migracao SQL:** Adicionar coluna `scheduled_start_at TIMESTAMPTZ` na tabela `whatsapp_campaigns`

**Solucao:**
- Adicionar campo de data/hora de inicio no formulario de criacao de campanha (Input type="datetime-local")
- Ao criar campanha, usar `scheduled_start_at` como base para calcular os `scheduled_at` dos lotes de mensagens (em vez de `new Date()`)
- Se nao informado, usa `now()` como comportamento atual

### 5. Configuracoes de Conta: Timezone + Usuarios

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAccountSettings.tsx` (reescrever completamente)

**Solucao - Secao Timezone:**
- Adicionar aba/secao "Geral" com seletor de timezone
- Usar o hook `useTenantSettings` existente para ler/gravar timezone no campo `settings` JSONB da tabela `tenants`
- Lista de timezones brasileiros comuns (America/Sao_Paulo, America/Manaus, America/Belem, etc.)
- Salvar via `updateTimezone()`

**Solucao - Secao Usuarios:**
- Adicionar aba "Usuarios" no mesmo componente
- Listar usuarios do tenant usando `get_users_with_roles` ou query direta em `profiles` filtrada por `tenant_id`
- Para cada usuario: mostrar nome, email, role
- Opcao de editar nome, email e senha (via edge function `admin-set-user-roles` ou nova edge function para update de credenciais)
- Usar `supabase.auth.admin.updateUserById()` em edge function para trocar email/senha

**Atualizar greetingHelper.ts:**
- Modificar `getGreeting()` para aceitar timezone opcional como parametro
- Default continua sendo `America/Sao_Paulo` se nao informado

### 6. IA Desativada por Padrao em Grupos

**Arquivo:** `src/components/WhatsApp/components/AIControlSection.tsx`
**Arquivo/Hook:** `src/hooks/useWhatsAppAIControl.ts`

**Solucao:**
- Quando o telefone/numero contem `@g.us`, a IA deve iniciar como desabilitada por padrao
- No hook `useWhatsAppAIControl`, se `phoneNumber` contém `@g.us` e nao existe registro em `whatsapp_ai_control`, tratar como IA desabilitada (inverter o default)
- A IA so responde em grupos se for explicitamente ativada pelo agente

### 7. Apagar Agente com Dupla Confirmacao e Limpeza Completa

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`

**Problema:** A exclusao atual so apaga instancias, kanban columns/cards e o agente. Faltam: mensagens, tickets, macros, emoji history, AI config, etc.

**Solucao - Dupla Confirmacao:**
- Primeiro dialog: "Tem certeza que deseja apagar o agente {nome}?"
- Segundo dialog (apos confirmar o primeiro): "ATENCAO: Esta acao apagara PERMANENTEMENTE todas as conversas, kanbans, macros e historico deste agente. Digite o nome do agente para confirmar:" + Input de confirmacao
- So executa se o nome digitado corresponder ao nome do agente

**Solucao - Limpeza Completa (ampliar `handleDeleteAgent`):**
Apagar em ordem (respeitando foreign keys):
1. `whatsapp_campaign_messages` (via campaigns do agente)
2. `whatsapp_campaigns` do agente
3. `whatsapp_tickets` do agente
4. `whatsapp_emoji_history` do agente
5. `whatsapp_macros` do agente
6. `whatsapp_ai_config` do agente
7. `whatsapp_conversation_access` do agente
8. `whatsapp_messages` do agente
9. `whatsapp_conversation_kanban` dos kanban columns do agente
10. `whatsapp_kanban_columns` do agente
11. `whatsapp_instances` do agente
12. `whatsapp_agent_roles` do agente
13. `whatsapp_agents` (o agente em si)

### 8. Compatibilidade com API Oficial (Meta)

**Revisao geral:**
- O sistema de tickets, abas (abertas/fila/grupos/encerrados), macros e emojis sao features de UI que nao dependem do provider (Z-API ou Meta)
- Garantir que o campo `provider_type` da instancia seja considerado ao:
  - Buscar grupos (Meta API nao suporta listagem de grupos - esconder botao "Buscar Grupos" se instancia for Meta)
  - Buscar foto de perfil (usar Graph API para Meta em vez de Z-API)
- Campanhas: o envio de mensagens ja deve respeitar o provider da instancia ao despachar
- Sem grandes mudancas necessarias, apenas condicionar features exclusivas Z-API

### Detalhes Tecnicos - Resumo

**Migracao SQL:**
- Adicionar coluna `scheduled_start_at TIMESTAMPTZ` em `whatsapp_campaigns`

**Edge Function necessaria (nova ou adaptar existente):**
- `admin-update-user-credentials` -- para alterar email/senha de usuarios do tenant (usando `supabase.auth.admin.updateUserById`)

**Arquivos editados:**
1. `ChatPanel.tsx` -- fix logo (formato igual ao header)
2. `ContactInfoPanel.tsx` -- fix campo `content` para `message_template`
3. `WhatsAppCampaigns.tsx` -- adicionar campo datetime de inicio
4. `WhatsAppAccountSettings.tsx` -- reescrever com timezone + aba usuarios
5. `WhatsAppAgentsSettings.tsx` -- dupla confirmacao + limpeza completa
6. `WhatsAppInbox.tsx` -- persistir grupos em `whatsapp_contacts`
7. `ConversationList.tsx` -- carregar grupos salvos
8. `greetingHelper.ts` -- aceitar timezone como parametro
9. Hook `useWhatsAppAIControl` -- default IA off para grupos

**Arquivos novos:**
- `supabase/functions/admin-update-user-credentials/index.ts`
