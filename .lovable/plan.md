
# Plano: Agente IA WhatsApp Isolado por Tenant

## Objetivo
1. Criar configuração de IA isolada por tenant
2. Transformar botão "Configurações" em Dropdown com opção "Agente IA"
3. Interface para configurar comportamento/personalidade da IA por tenant
4. Edge Function que usa Lovable AI (Gemini) para respostas automáticas

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ISOLAMENTO POR TENANT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TENANT A                           TENANT B                               │
│   ┌─────────────────────┐           ┌─────────────────────┐                 │
│   │ whatsapp_ai_config  │           │ whatsapp_ai_config  │                 │
│   │ - tenant_id: A      │           │ - tenant_id: B      │                 │
│   │ - system_prompt:    │           │ - system_prompt:    │                 │
│   │   "Você é Maria,    │           │   "Você é João,     │                 │
│   │   assistente do     │           │   assistente do     │                 │
│   │   Escritório X..."  │           │   Escritório Y..."  │                 │
│   │ - is_enabled: true  │           │ - is_enabled: false │                 │
│   └─────────────────────┘           └─────────────────────┘                 │
│                                                                             │
│   SUPER ADMIN (tenant_id = NULL)                                            │
│   ┌─────────────────────┐                                                   │
│   │ whatsapp_ai_config  │                                                   │
│   │ - tenant_id: NULL   │                                                   │
│   │ - system_prompt:    │                                                   │
│   │   "Você é a VOUTI   │                                                   │
│   │   assistente..."    │                                                   │
│   └─────────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Interface: Sidebar com Dropdown

```text
ANTES:                              DEPOIS:
┌────────────────────┐              ┌────────────────────┐
│ 📥 Caixa de Entrada│              │ 📥 Caixa de Entrada│
│ 💬 Conversas       │              │ 💬 Conversas       │
│ 📊 Kanban CRM      │              │ 📊 Kanban CRM      │
│ 👥 Contatos        │              │ 👥 Contatos        │
│ 📈 Relatórios      │              │ 📈 Relatórios      │
│ 📢 Campanhas       │              │ 📢 Campanhas       │
│ ❓ Central de Ajuda│              │ ❓ Central de Ajuda│
│ ⚙️ Configurações   │ ← Botão     │ ⚙️ Configurações ▼ │ ← Dropdown
└────────────────────┘              │   ├─ Conexão Z-API │
                                    │   ├─ Fonte de Leads│
                                    │   └─ 🤖 Agente IA  │ ← NOVO
                                    └────────────────────┘
```

## Componentes

### 1. Nova Tabela: `whatsapp_ai_config`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid (nullable) | NULL = Super Admin |
| instance_name | text | Instância vinculada |
| is_enabled | boolean | IA ativa? |
| agent_name | text | Nome do agente (ex: "Maria") |
| system_prompt | text | Prompt com comportamento |
| model_name | text | gemini-3-flash-preview |
| temperature | float | 0.0 a 1.0 |
| max_history | int | Mensagens de contexto |
| created_at | timestamp | Criação |
| updated_at | timestamp | Atualização |

### 2. Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Interface de configuração do Agente IA |
| `supabase/functions/whatsapp-ai-chat/index.ts` | Edge Function que chama Lovable AI |

### 3. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Transformar "Configurações" em DropdownMenu |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Idem para Super Admin |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Adicionar seção "ai-settings" |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx` | Idem |
| `supabase/functions/whatsapp-webhook/index.ts` | Chamar IA antes das automações |

## Nova Seção de Configurações: Agente IA

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Configurações > 🤖 Agente IA                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Habilitar Agente IA                                    [  Toggle  ]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Nome do Agente                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Maria                                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Personalidade e Comportamento (System Prompt)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Você é Maria, assistente virtual do Escritório Silva Advocacia.     │  │
│  │                                                                       │  │
│  │  REGRAS:                                                              │  │
│  │  - Seja educada e profissional                                        │  │
│  │  - Responda em português                                              │  │
│  │  - Limite respostas a 300 caracteres                                  │  │
│  │  - Se não souber, peça para aguardar um atendente                     │  │
│  │                                                                       │  │
│  │  SOBRE O ESCRITÓRIO:                                                  │  │
│  │  - Especializado em Direito Trabalhista                               │  │
│  │  - 15 anos de experiência                                             │  │
│  │  - Atendimento humanizado                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Modelo IA                           Temperatura                            │
│  ┌─────────────────────────┐        ┌─────────────────────────┐             │
│  │ gemini-3-flash-preview ▼│        │ 0.7        [━━━━●━━━━━] │             │
│  └─────────────────────────┘        └─────────────────────────┘             │
│                                                                             │
│  Mensagens de Histórico                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  10                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  Quantas mensagens anteriores usar como contexto                            │
│                                                                             │
│                                              [ Salvar Configurações ]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Edge Function: whatsapp-ai-chat

```typescript
// supabase/functions/whatsapp-ai-chat/index.ts

// Usa LOVABLE_API_KEY (já configurado automaticamente)
// Endpoint: https://ai.gateway.lovable.dev/v1/chat/completions

// Recebe:
// - phone: número do lead
// - message: mensagem recebida
// - tenant_id: isolamento (ou NULL para Super Admin)

// Processo:
// 1. Buscar config da IA para o tenant
// 2. Buscar histórico de mensagens (últimas N)
// 3. Montar payload com system_prompt + histórico + mensagem atual
// 4. Chamar Lovable AI Gateway (Gemini)
// 5. Retornar resposta gerada

// Retorna:
// - response: texto da resposta
// - success: boolean
```

## Fluxo de Mensagem com IA

```text
1. Lead envia "Olá, preciso de ajuda"
           │
           ▼
2. whatsapp-webhook recebe mensagem
           │
           ▼
3. Busca whatsapp_ai_config WHERE tenant_id = X AND is_enabled = true
           │
           ├─── NÃO ENCONTROU → Usa automações por keyword
           │
           ▼ ENCONTROU
4. Busca últimas N mensagens do histórico (contexto)
           │
           ▼
5. Chama whatsapp-ai-chat:
   {
     phone: "5545...",
     message: "Olá, preciso de ajuda",
     history: [...],
     config: { system_prompt, temperature, model }
   }
           │
           ▼
6. whatsapp-ai-chat → Lovable AI Gateway (Gemini)
           │
           ▼
7. Resposta gerada: "Olá! 👋 Sou a Maria do Escritório Silva.
                     Como posso ajudar você hoje?"
           │
           ▼
8. Envia via Z-API para o lead
```

## Migração SQL

```sql
-- Tabela de configuração de IA por tenant
CREATE TABLE public.whatsapp_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  instance_name text,
  is_enabled boolean DEFAULT false,
  agent_name text DEFAULT 'Assistente',
  system_prompt text DEFAULT 'Você é um assistente virtual prestativo. Responda de forma amigável e profissional. Limite suas respostas a 300 caracteres.',
  model_name text DEFAULT 'google/gemini-3-flash-preview',
  temperature float DEFAULT 0.7,
  max_history int DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)  -- Uma config por tenant
);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_ai_config_updated_at
  BEFORE UPDATE ON whatsapp_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE whatsapp_ai_config ENABLE ROW LEVEL SECURITY;

-- Tenant pode gerenciar sua própria config
CREATE POLICY "tenant_manage_ai_config"
ON whatsapp_ai_config FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Super Admin pode gerenciar config sem tenant
CREATE POLICY "superadmin_manage_ai_config"
ON whatsapp_ai_config FOR ALL
USING (tenant_id IS NULL AND is_super_admin(auth.uid()))
WITH CHECK (tenant_id IS NULL AND is_super_admin(auth.uid()));
```

## Secrets

Já disponível: `LOVABLE_API_KEY` (auto-provisionado pelo Lovable)

## Resultado Esperado

1. Botão "Configurações" vira Dropdown com 3 opções:
   - Conexão Z-API
   - Fonte de Leads
   - 🤖 Agente IA (NOVO)

2. Ao clicar em "Agente IA", abre tela de configuração com:
   - Toggle para habilitar/desabilitar
   - Nome do agente
   - Textarea para System Prompt (comportamento)
   - Seletor de modelo
   - Slider de temperatura
   - Número de mensagens de histórico

3. Cada tenant tem sua própria configuração isolada

4. Super Admin também pode configurar seu próprio agente

5. Quando IA está habilitada, respostas são geradas automaticamente via Gemini
