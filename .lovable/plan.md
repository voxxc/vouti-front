

## Implementacao de 4 funcionalidades

### 1. Campanhas em Massa (WhatsAppCampaigns)

Nova interface completa na secao "Campanhas" do CRM com:

**Tabela no banco: `whatsapp_campaigns`**
- id, tenant_id, agent_id, name, message_template (texto com suporte a {{nome}}), target_column_id (FK para whatsapp_kanban_columns), batch_size (ex: 10), interval_minutes (ex: 4), status (draft/running/paused/completed), total_contacts, sent_count, failed_count, created_at, updated_at

**Tabela: `whatsapp_campaign_messages`**
- id, campaign_id, phone, contact_name, status (pending/sent/failed), scheduled_at, sent_at, error_message, created_at

**Frontend: `WhatsAppCampaigns.tsx`**
- Formulario para criar campanha: nome, mensagem (textarea com botao para inserir {{nome}}), selecao de agente, selecao de coluna do Kanban desse agente, tamanho do lote (padrao 10), intervalo entre lotes em minutos (padrao 4)
- Ao criar, busca todos os phones da `whatsapp_conversation_kanban` naquela coluna, resolve nomes via `whatsapp_contacts`, e insere registros em `whatsapp_campaign_messages` com `scheduled_at` escalonado (lote 1 = agora, lote 2 = +4min, lote 3 = +8min...)
- Lista de campanhas com status, progresso (barra), opcao de pausar/retomar
- A variavel {{nome}} e substituida pelo nome do contato no momento do envio

**Edge Function: `whatsapp-process-campaigns`**
- Similar ao `whatsapp-process-queue` existente: busca mensagens pendentes de campanhas que estao "due", envia via Z-API/Meta, atualiza status
- Sera chamada via cron job (a cada 1 minuto)

---

### 2. Agendar Follow-Up (ContactInfoPanel)

**No `ContactInfoPanel.tsx`**, ao clicar em "Agendar Follow-Up":
- Expande um formulario inline (collapsible) com:
  - Textarea para a mensagem
  - Input de data (date picker)
  - Input de hora (time picker)
  - Botao "Agendar"
- Ao confirmar, insere na tabela `whatsapp_pending_messages` com `scheduled_at` = data+hora selecionada, `phone` = numero do contato, `tenant_id`, e um `lead_source` = 'follow_up'
- O `whatsapp-process-queue` existente ja processa mensagens pendentes, entao o follow-up sera enviado automaticamente

---

### 3. Badges de data no chat

**Vouti.CRM (ChatPanel.tsx)**
- Antes de renderizar as mensagens, agrupar por data
- Inserir um separador de data entre mensagens de dias diferentes
- Visual: badge centralizado com fundo semi-transparente mostrando "Hoje", "Ontem", ou a data formatada (ex: "15 de fevereiro de 2026")
- Estilo similar ao WhatsApp: texto pequeno, pill cinza centralizada

**Vouti Comum (InternalMessaging.tsx / MessageBubble.tsx)**
- Mesmo conceito: agrupar mensagens por data e inserir badges de separacao entre dias diferentes

---

### 4. Fundo estilo WhatsApp no chat do CRM

**No `ChatPanel.tsx`**
- Adicionar ao container de mensagens um background com pattern sutil estilo WhatsApp
- Usar um SVG pattern inline (icones pequenos de mensagem, telefone, etc.) com opacidade muito baixa (~3-5%)
- Funciona em dark e light mode usando cores CSS variables
- Classe CSS customizada aplicada na area de mensagens (ScrollArea)

---

### Detalhes tecnicos

**Migracao SQL:**
```text
CREATE TABLE whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id),
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_column_id UUID REFERENCES whatsapp_kanban_columns(id),
  batch_size INTEGER DEFAULT 10,
  interval_minutes INTEGER DEFAULT 4,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed')),
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE whatsapp_campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies para ambas tabelas (tenant isolation)
-- Trigger para updated_at em whatsapp_campaigns
```

**Arquivos modificados/criados:**

| Arquivo | Acao |
|---|---|
| Nova migracao SQL | Criar tabelas whatsapp_campaigns e whatsapp_campaign_messages |
| `src/components/WhatsApp/sections/WhatsAppCampaigns.tsx` | Reescrever com formulario completo de campanha, lista de campanhas, progresso |
| `supabase/functions/whatsapp-process-campaigns/index.ts` | Nova edge function para processar fila de campanhas |
| `src/components/WhatsApp/components/ContactInfoPanel.tsx` | Expandir "Agendar Follow-Up" com formulario inline (mensagem + data/hora) |
| `src/components/WhatsApp/components/ChatPanel.tsx` | Adicionar badges de data entre mensagens + background pattern WhatsApp |
| `src/components/Communication/InternalMessaging.tsx` | Adicionar badges de data entre mensagens do chat interno |

