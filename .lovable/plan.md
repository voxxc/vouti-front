
## Alteracoes no CRM - 4 Itens Principais

### 1. Sistema de Abas na Lista de Conversas (ConversationList)

Substituir a barra de grupos por 4 botoes/abas horizontais acima da lista de conversas:

**Arquivo principal:** `src/components/WhatsApp/components/ConversationList.tsx`
**Arquivo auxiliar:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

**Abas:**
1. **Abertas** (icone MessageSquare) - Conversas ativas que o agente ja aceitou/respondeu
2. **Fila de Espera** (icone Inbox) - TODAS as conversas que chegam para aquele numero. Novas conversas sao "tickets" que precisam ser aceitos. Ao aceitar, movem para a aba "Abertas"
3. **Grupos** (icone Users) - Grupos WhatsApp do numero. Interacao normal, mas IA so fala se habilitada por conversa
4. **Encerrados** (icone Clock/CheckCircle) - Atendimentos encerrados nas ultimas 24h (historico). Se o contato voltar para a Fila de Espera, aparece la normalmente mas mantem historico aqui

**Mudancas na ConversationList:**
- Remover a "Groups Bar" atual
- Adicionar uma barra de abas com 4 botoes compactos (icone + label pequeno) no topo, abaixo do campo de busca
- Nova prop `activeTab` e `onTabChange` para controlar qual aba esta ativa
- Nova prop `onAcceptTicket` para aceitar tickets da Fila de Espera
- Nova prop `onCloseTicket` para encerrar atendimentos

**Mudancas no WhatsAppInbox:**
- Gerenciar estado `activeTab` (default: "open")
- Filtrar conversas de acordo com a aba ativa
- Para separar conversas "abertas" vs "fila de espera", sera necessario um campo de status. Proposta: adicionar coluna `ticket_status` na tabela `whatsapp_conversation_kanban` ou criar uma nova tabela `whatsapp_tickets`

**Mudancas no ChatPanel (header):**
- Substituir botoes Video e Phone por:
  - **Aceitar Ticket** (icone CheckCircle, verde) - visivel quando conversa vem da Fila de Espera
  - **Encerrar Ticket** (icone XCircle, vermelho) - visivel quando conversa esta aberta
  - Manter o botao **tres pontinhos** (MoreVertical)

### 2. Contador de 24h por Conversa

**Arquivos:** `ConversationList.tsx`, `WhatsAppInbox.tsx`

- Ao responder um contato (1a mensagem outgoing), registrar timestamp de inicio
- Exibir um contador regressivo de 24h no card da conversa na lista
- Design: badge minimalista e suave, pequeno, no canto do card (ex: "23:45" em texto muted, com barra de progresso circular fina ou apenas texto)
- Aumentar levemente a altura do card se necessario para acomodar o contador
- Quando expirar (24h), mover automaticamente para "Encerrados"

**Dados:** Usar o timestamp da primeira resposta do agente na conversa (primeira mensagem outgoing apos a ultima mensagem incoming). Pode ser calculado client-side a partir das mensagens existentes, ou armazenado em uma nova coluna `ticket_started_at` em `whatsapp_conversation_kanban`

### 3. Fix Sidebar Collapse e Drawer de Projetos

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppProjects.tsx`

Problema: Quando a sidebar esta colapsada, o drawer de Projetos nao se ajusta (provavelmente usa `side="left-offset"` que calcula offset baseado na largura fixa da sidebar).

**Solucao:**
- Passar `sidebarCollapsed` como prop para `WhatsAppProjects`
- Ajustar o offset do Sheet baseado no estado da sidebar (w-56 = 14rem vs w-14 = 3.5rem)
- Ou usar CSS dinamico no `SheetContent` para compensar

### 4. Ativacao de Macros em Configuracoes

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppMacrosSettings.tsx`
**Nova tabela:** `whatsapp_macros`

**Funcionalidades:**
- Configurar macros por agente (selecionar qual agente tera macros ativadas)
- Criar/editar macros com:
  - Nome/atalho da macro
  - Texto da mensagem com variaveis: `{{nome}}`, `{{telefone}}`, `{{email}}` (dados do contato/lead cadastrado)
  - Variavel especial `{{saudacao}}` que automaticamente substitui por "Bom dia", "Boa tarde" ou "Boa noite" de acordo com o fuso de Brasilia (America/Sao_Paulo)
- Toggle de ativacao/desativacao por agente
- Lista de macros com edicao inline ou modal

**Saudacao automatica:**
- Usar a funcao `getGreeting()` ja existente em `src/utils/greetingHelper.ts` (ja calcula Bom dia/Boa tarde/Boa noite baseado na hora)
- Ajustar para usar fuso de Brasilia explicitamente (converter hora UTC para Brasilia antes de calcular)
- Ao processar a macro, substituir `{{saudacao}}` pelo valor retornado

### Detalhes Tecnicos

**Migracao SQL necessaria:**

```sql
-- Tabela de macros
CREATE TABLE whatsapp_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shortcut TEXT, -- atalho rapido ex: /ola
  message_template TEXT NOT NULL, -- texto com {{variaveis}}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de tickets (status das conversas)
CREATE TABLE whatsapp_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id),
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, open, closed
  accepted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies para ambas tabelas (tenant-based)
CREATE POLICY "tenant_macros" ON whatsapp_macros
  FOR ALL USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_tickets" ON whatsapp_tickets
  FOR ALL USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);
```

**Arquivos afetados (resumo):**

1. `src/components/WhatsApp/components/ConversationList.tsx` -- 4 abas, remover groups bar, contador 24h
2. `src/components/WhatsApp/components/ChatPanel.tsx` -- trocar Video/Phone por Aceitar/Encerrar ticket
3. `src/components/WhatsApp/sections/WhatsAppInbox.tsx` -- gerenciar tabs, tickets, filtros
4. `src/components/WhatsApp/sections/WhatsAppProjects.tsx` -- fix offset com sidebar colapsada
5. `src/components/WhatsApp/WhatsAppLayout.tsx` -- passar sidebarCollapsed para Projects
6. `src/components/WhatsApp/settings/WhatsAppMacrosSettings.tsx` -- implementar CRUD de macros
7. `src/utils/greetingHelper.ts` -- ajustar para fuso de Brasilia explicito
8. Migracao SQL -- criar tabelas `whatsapp_macros` e `whatsapp_tickets`

**Fluxo do sistema de tickets:**
- Mensagem incoming sem ticket existente -> cria ticket com status "waiting" -> aparece na Fila de Espera
- Agente clica "Aceitar Ticket" -> status muda para "open", `accepted_at = now()` -> move para Abertas, inicia contador 24h
- Agente clica "Encerrar Ticket" -> status muda para "closed", `closed_at = now()` -> move para Encerrados
- Contato envia nova mensagem apos encerramento -> cria novo ticket "waiting" na Fila de Espera
- Apos 24h do `accepted_at` sem nova interacao -> auto-move para Encerrados (calculado client-side)
