
# Plano: Automação de WhatsApp para Leads da Página Inicial

## Resumo

Quando um lead se cadastra na página inicial (`vouti.co/`), o sistema automaticamente enviará uma mensagem de boas-vindas via WhatsApp usando as credenciais Z-API configuradas pelo tenant que controla essa automação.

## Desafio Especial: `landing_leads` não tem `tenant_id`

A tabela `landing_leads` (usada pela página inicial) **não possui** coluna `tenant_id`, diferente de `leads_captacao`. Isso requer uma abordagem especial:

```text
┌────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA PROPOSTA                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Lead cadastra em vouti.co/ (HomePage.tsx)                        │
│              │                                                     │
│              ▼                                                     │
│  INSERT em landing_leads (SEM tenant_id)                          │
│              │                                                     │
│              ▼                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │   DB Trigger: tr_landing_leads_whatsapp                    │   │
│  │   Busca automações ativas para lead_source='landing_leads' │   │
│  │   Insere na fila whatsapp_pending_messages                 │   │
│  └────────────────────────────────────────────────────────────┘   │
│              │                                                     │
│              ▼                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │   Edge Function: whatsapp-process-queue (cron/invocação)   │   │
│  │   - Busca mensagens pendentes com scheduled_at <= NOW()    │   │
│  │   - Busca credenciais Z-API do tenant via trigger config   │   │
│  │   - Envia mensagem via Z-API                               │   │
│  │   - Atualiza status para 'sent' ou 'failed'                │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Implementação em 3 Etapas

### ETAPA 1: Criar Tabela de Fila de Mensagens

Nova tabela `whatsapp_pending_messages` para enfileirar mensagens a enviar:

```sql
CREATE TABLE whatsapp_pending_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  trigger_id UUID REFERENCES whatsapp_lead_triggers(id),
  lead_source TEXT NOT NULL, -- 'landing_leads' ou 'leads_captacao'
  lead_id UUID NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca eficiente
CREATE INDEX idx_pending_status_scheduled 
  ON whatsapp_pending_messages(status, scheduled_at) 
  WHERE status = 'pending';

-- RLS
ALTER TABLE whatsapp_pending_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON whatsapp_pending_messages
  FOR ALL USING (true) WITH CHECK (true);
```

### ETAPA 2: Criar Database Trigger para `landing_leads`

Trigger que dispara quando um novo lead é inserido:

```sql
CREATE OR REPLACE FUNCTION notify_whatsapp_landing_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger RECORD;
  v_message TEXT;
BEGIN
  -- Buscar triggers ativos para landing_leads
  FOR v_trigger IN 
    SELECT * FROM whatsapp_lead_triggers 
    WHERE lead_source = 'landing_leads' 
      AND is_active = true
  LOOP
    -- Substituir variáveis na mensagem
    v_message := v_trigger.welcome_message;
    v_message := REPLACE(v_message, '{{nome}}', COALESCE(NEW.nome, ''));
    v_message := REPLACE(v_message, '{{email}}', COALESCE(NEW.email, ''));
    v_message := REPLACE(v_message, '{{telefone}}', COALESCE(NEW.telefone, ''));
    v_message := REPLACE(v_message, '{{tamanho_escritorio}}', COALESCE(NEW.tamanho_escritorio, ''));
    v_message := REPLACE(v_message, '{{origem}}', COALESCE(NEW.origem, ''));
    
    -- Inserir na fila SOMENTE se tiver telefone
    IF NEW.telefone IS NOT NULL AND NEW.telefone != '' THEN
      INSERT INTO whatsapp_pending_messages (
        tenant_id,
        trigger_id,
        lead_source,
        lead_id,
        phone,
        message,
        scheduled_at
      ) VALUES (
        v_trigger.tenant_id,
        v_trigger.id,
        'landing_leads',
        NEW.id,
        NEW.telefone,
        v_message,
        NOW() + (v_trigger.welcome_delay_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER tr_landing_leads_whatsapp
  AFTER INSERT ON landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_landing_lead();
```

### ETAPA 3: Criar Edge Function para Processar Fila

Nova Edge Function `whatsapp-process-queue` que processa mensagens pendentes:

```typescript
// supabase/functions/whatsapp-process-queue/index.ts

// 1. Busca mensagens com status='pending' e scheduled_at <= NOW()
// 2. Para cada mensagem:
//    a. Busca credenciais Z-API do tenant via whatsapp_instances
//    b. Formata telefone para padrão internacional
//    c. Envia via Z-API
//    d. Atualiza status para 'sent' ou 'failed'
// 3. Salva mensagem enviada em whatsapp_messages para histórico
```

### ETAPA 4: Configurar Automação para DEMORAIS

Inserir configuração na tabela `whatsapp_lead_triggers`:

```sql
INSERT INTO whatsapp_lead_triggers (
  tenant_id,
  lead_source,
  is_active,
  welcome_message,
  welcome_delay_minutes
) VALUES (
  'd395b3a1-1ea1-4710-bcc1-ff5f6a279750', -- DEMORAIS
  'landing_leads',
  true,
  '👋 Olá, {{nome}}!

Vi que você se cadastrou na VOUTI. Sou da equipe de atendimento e gostaria de saber:

Como posso te ajudar hoje? 

- Quer conhecer nossos planos?
- Tem alguma dúvida específica?
- Deseja agendar uma demonstração?

É só responder! 😊',
  1 -- Envia após 1 minuto
);
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Tabela `whatsapp_pending_messages` + triggers |
| `supabase/functions/whatsapp-process-queue/index.ts` | Criar | Processador de fila |
| `supabase/config.toml` | Modificar | Registrar nova função |
| `src/components/CRM/WhatsAppBot.tsx` | Modificar | UI para ver/editar triggers |

## Fluxo Completo

```text
1. Visitante acessa vouti.co/
          │
2. Preenche formulário (nome, email, whatsapp, tamanho)
          │
3. createLandingLead() insere em landing_leads
          │
4. Trigger tr_landing_leads_whatsapp dispara
          │
5. Busca automações ativas para 'landing_leads'
   └─ Encontra: DEMORAIS (tenant_id: d395b3a1-...)
          │
6. Insere em whatsapp_pending_messages:
   - phone: "45998011658"
   - message: "Olá, Rafael Morais! Vi que você..."
   - scheduled_at: NOW() + 1 minute
          │
7. Edge Function whatsapp-process-queue (invocada)
          │
8. Busca credenciais Z-API do DEMORAIS em whatsapp_instances
          │
9. Envia via Z-API para 5545998011658
          │
10. Lead recebe WhatsApp instantâneo!
```

## Considerações Importantes

1. **Múltiplos Tenants**: Vários tenants podem ter automações para `landing_leads`. Cada um receberá uma cópia do lead em sua fila.

2. **Formatação de Telefone**: A Edge Function deve formatar o telefone para o padrão internacional (55 + DDD + número).

3. **Rate Limiting**: Implementar limite de 100 mensagens/hora por tenant para evitar bloqueio da Z-API.

4. **Invocação da Função**: Pode ser via:
   - Cron job externo (recomendado)
   - Supabase pg_cron
   - Chamada após INSERT (via Supabase Realtime)

5. **Histórico**: Mensagens enviadas devem ser salvas em `whatsapp_messages` para aparecerem no inbox.
