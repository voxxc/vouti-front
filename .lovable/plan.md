
# Plano: WhatsApp Bot Multi-Tenant com Seleção de Landing Page

## Entendimento do Problema

Você quer ativar o WhatsApp Bot para o tenant **DEMORAIS** (id: `d395b3a1-1ea1-4710-bcc1-ff5f6a279750`), mas com uma **arquitetura flexível** que permite escolher qual landing page será a fonte de leads:

1. **Landing Page Principal** (`vouti.co/`) - Usa tabela `landing_leads` (sem `tenant_id`)
2. **Landing Pages dos Tenants** (`/{tenant}/landing-1`, `/{tenant}/office`) - Usa tabela `leads_captacao` (com `tenant_id`)

O sistema precisa ser desenhado para suportar **múltiplas fontes de leads**.

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TENANT SETTINGS (settings JSONB)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  {                                                                          │
│    "whatsapp_enabled": true,                                                │
│    "whatsapp_lead_source": "leads_captacao"  ◀── ou "landing_leads"        │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   landing_leads   │           │  leads_captacao   │
        │  (vouti.co/)      │           │ (/{tenant}/...)   │
        │  Sem tenant_id    │           │ Com tenant_id     │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
              ┌────────────────────────────────────────┐
              │        whatsapp_lead_triggers          │
              │  (Nova tabela para automação de leads) │
              │  - tenant_id                           │
              │  - lead_source: 'landing_leads' |      │
              │                 'leads_captacao'       │
              │  - trigger_on_create: boolean          │
              │  - welcome_message_template            │
              │  - follow_up_delay_minutes             │
              └────────────────────────────────────────┘
                                    │
                                    ▼
              ┌────────────────────────────────────────┐
              │     WhatsApp Bot (Z-API)               │
              │  Envia mensagem automática ao lead     │
              └────────────────────────────────────────┘
```

---

## Implementação em 4 Fases

### FASE 1: Feature Flag e Seleção de Fonte de Leads

**Objetivo**: Habilitar WhatsApp Bot para DEMORAIS com UI para escolher fonte de leads.

1. **Atualizar settings do tenant DEMORAIS**:
   ```sql
   UPDATE tenants 
   SET settings = jsonb_set(
     COALESCE(settings, '{}'), 
     '{whatsapp_enabled}', 'true'
   )
   WHERE slug = 'demorais';
   ```

2. **Criar hook `useTenantFeatures`**:
   - Verifica se `settings.whatsapp_enabled === true`
   - Retorna fonte de leads configurada

3. **Modificar `src/pages/CRM.tsx`**:
   - Habilitar tab "WhatsApp Bot" condicionalmente
   - Remover badge "Em breve" para tenants com flag ativa

### FASE 2: UI de Configuração de Fonte de Leads

**Objetivo**: Adicionar configuração no WhatsAppBot.tsx para escolher origem dos leads.

**Novo componente dentro de WhatsAppBot.tsx**:
```typescript
// Seção de Configuração de Leads
<Card>
  <CardHeader>
    <CardTitle>Fonte de Leads</CardTitle>
    <CardDescription>
      Escolha de onde vêm os leads para automação
    </CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup value={leadSource} onValueChange={setLeadSource}>
      <RadioGroupItem value="leads_captacao">
        Landing Pages do Escritório 
        (/{tenant}/landing-1, /{tenant}/office)
      </RadioGroupItem>
      <RadioGroupItem value="landing_leads">
        Landing Page Principal 
        (vouti.co/)
      </RadioGroupItem>
    </RadioGroup>
  </CardContent>
</Card>
```

### FASE 3: Nova Tabela e Trigger de Automação

**Objetivo**: Criar infraestrutura para automação de leads.

**Nova tabela `whatsapp_lead_triggers`**:
```sql
CREATE TABLE whatsapp_lead_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  lead_source TEXT NOT NULL CHECK (lead_source IN ('landing_leads', 'leads_captacao')),
  is_active BOOLEAN DEFAULT true,
  
  -- Configurações de mensagem
  welcome_message TEXT NOT NULL,
  welcome_delay_minutes INTEGER DEFAULT 1,
  
  -- Follow-up (se não responder)
  followup_enabled BOOLEAN DEFAULT false,
  followup_message TEXT,
  followup_delay_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_lead_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON whatsapp_lead_triggers
  USING (tenant_id = get_user_tenant_id() OR is_super_admin(auth.uid()));
```

**Database Trigger para novos leads**:
```sql
-- Trigger para leads_captacao (tenants)
CREATE OR REPLACE FUNCTION notify_whatsapp_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na fila de envio do WhatsApp
  INSERT INTO whatsapp_pending_messages (
    tenant_id,
    phone,
    message,
    lead_source,
    lead_id,
    scheduled_at
  )
  SELECT 
    NEW.tenant_id,
    NEW.telefone,
    wlt.welcome_message,
    'leads_captacao',
    NEW.id,
    NOW() + (wlt.welcome_delay_minutes || ' minutes')::INTERVAL
  FROM whatsapp_lead_triggers wlt
  WHERE wlt.tenant_id = NEW.tenant_id
    AND wlt.lead_source = 'leads_captacao'
    AND wlt.is_active = true
    AND NEW.telefone IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_leads_captacao_whatsapp
  AFTER INSERT ON leads_captacao
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_new_lead();
```

### FASE 4: Processador de Fila de Mensagens

**Objetivo**: Edge Function que processa mensagens pendentes.

**Nova Edge Function `whatsapp-process-queue`**:
- Executada via cron (a cada 1 minuto)
- Busca mensagens com `scheduled_at <= NOW()`
- Envia via Z-API usando credenciais do tenant
- Atualiza status para 'sent' ou 'failed'

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useTenantFeatures.ts` | Criar | Hook para feature flags |
| `src/pages/CRM.tsx` | Modificar | Habilitar tab WhatsApp condicionalmente |
| `src/components/CRM/WhatsAppBot.tsx` | Modificar | Adicionar seletor de fonte de leads + tenant_id |
| `src/components/CRM/WhatsAppLeadConfig.tsx` | Criar | UI de configuração de triggers |
| `supabase/functions/whatsapp-process-queue/index.ts` | Criar | Processador de fila |
| `supabase/functions/whatsapp-webhook/index.ts` | Modificar | Suportar multi-tenant |
| Migração SQL | Criar | Tabelas + triggers + RLS |

---

## Fluxo Completo para DEMORAIS

```text
1. Admin DEMORAIS acessa CRM → WhatsApp Bot
                │
2. Configura credenciais Z-API do escritório
                │
3. Seleciona fonte: "Landing Pages do Escritório"
                │
4. Configura mensagem de boas-vindas:
   "Olá {{nome}}! Vi que você se cadastrou..."
                │
5. Lead preenche formulário em /demorais/office
                │
6. Trigger insere na fila whatsapp_pending_messages
                │
7. Edge Function processa fila (1 min delay)
                │
8. Z-API envia WhatsApp automático ao lead
                │
9. Lead responde → webhook captura → Inbox
                │
10. Atendente continua conversa pelo painel
```

---

## Variáveis Suportadas nas Mensagens

| Variável | Descrição | Tabela |
|----------|-----------|--------|
| `{{nome}}` | Nome do lead | Ambas |
| `{{email}}` | Email do lead | Ambas |
| `{{telefone}}` | Telefone formatado | Ambas |
| `{{tipo}}` | Tipo/Área de interesse | leads_captacao |
| `{{origem}}` | Origem do cadastro | Ambas |
| `{{tamanho_escritorio}}` | Tamanho do escritório | landing_leads |

---

## Ordem de Implementação

1. **Migração SQL** - Tabelas + triggers + update do tenant DEMORAIS
2. **Hook useTenantFeatures** - Verificar flags
3. **CRM.tsx** - Habilitar tab condicionalmente  
4. **WhatsAppBot.tsx** - Adicionar tenant_id nas operações
5. **WhatsAppLeadConfig.tsx** - UI de configuração
6. **Edge Function de processamento de fila**
7. **Testar fluxo completo**

---

## Segurança

- RLS em todas as tabelas novas com `tenant_id = get_user_tenant_id()`
- Credenciais Z-API armazenadas por tenant (já implementado)
- Rate limiting: máximo 100 mensagens/hora por tenant
- Logs de auditoria em todas as mensagens enviadas
