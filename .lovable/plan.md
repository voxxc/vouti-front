

## Plano: Automação WhatsApp para Leads da Landing Page (Super Admin)

### Análise do Cenário Atual

**Infraestrutura existente:**
- Trigger `tr_landing_leads_whatsapp` dispara quando um lead é inserido
- Função `notify_whatsapp_landing_lead()` insere na fila `whatsapp_pending_messages`
- Edge Function `whatsapp-process-queue` processa e envia mensagens
- Super Admin tem instância conectada (`tenant_id = NULL`)

**Problemas identificados:**

| Problema | Impacto |
|----------|---------|
| `whatsapp_lead_triggers.tenant_id` é **NOT NULL** | Não permite trigger para Super Admin |
| Trigger busca triggers com `tenant_id` específico de tenants | Leads da landing não disparam para Super Admin |
| `whatsapp_pending_messages.tenant_id` é **NOT NULL** | Não aceita mensagens do Super Admin |
| `whatsapp-process-queue` busca instância por `tenant_id` | Não encontra instância do Super Admin |
| Telefone não está normalizado com +55 | Formato inconsistente no banco |

---

### Solução Proposta

Criar uma experiência **diferenciada para o Super Admin** sem alterar o funcionamento dos Tenants.

---

### Etapa 1: Ajustes no Banco de Dados

**1.1 Permitir tenant_id NULL nas tabelas:**

```sql
-- whatsapp_lead_triggers: permitir Super Admin (tenant_id NULL)
ALTER TABLE whatsapp_lead_triggers 
  ALTER COLUMN tenant_id DROP NOT NULL;

-- whatsapp_pending_messages: permitir Super Admin (tenant_id NULL)
ALTER TABLE whatsapp_pending_messages 
  ALTER COLUMN tenant_id DROP NOT NULL;
```

**1.2 Criar trigger específico para Super Admin:**

```sql
INSERT INTO whatsapp_lead_triggers (
  tenant_id,            -- NULL = Super Admin
  lead_source,
  is_active,
  welcome_message,
  welcome_delay_minutes -- 0 = imediato
) VALUES (
  NULL,
  'landing_leads',
  true,
  '👋 Olá, {{nome}}!

Sou o agente virtual da VOUTI. Vi que você acabou de conhecer nossa plataforma!

Como posso ajudar você hoje?',
  0
);
```

**1.3 Atualizar função do trigger:**

A função `notify_whatsapp_landing_lead()` precisa ser ajustada para incluir triggers onde `tenant_id IS NULL`:

```sql
CREATE OR REPLACE FUNCTION notify_whatsapp_landing_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger RECORD;
  v_message TEXT;
  v_phone TEXT;
BEGIN
  -- Normalizar telefone com +55
  v_phone := REGEXP_REPLACE(NEW.telefone, '[^0-9]', '', 'g');
  IF LENGTH(v_phone) = 10 OR LENGTH(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- Buscar triggers ativos (incluindo Super Admin com tenant_id NULL)
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
        v_trigger.tenant_id,  -- NULL para Super Admin
        v_trigger.id,
        'landing_leads',
        NEW.id,
        v_phone,              -- Telefone normalizado
        v_message,
        NOW() + (v_trigger.welcome_delay_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
```

---

### Etapa 2: Ajustar Edge Function `whatsapp-process-queue`

A função precisa buscar a instância corretamente para o Super Admin:

| Contexto | Busca atual | Busca correta |
|----------|-------------|---------------|
| Tenant | `tenant_id = msg.tenant_id` | Mantém |
| Super Admin | (não suportado) | `tenant_id IS NULL` |

**Mudança principal:**

```typescript
// ANTES: Busca apenas por tenant_id específico
const { data: instance } = await supabase
  .from('whatsapp_instances')
  .select('*')
  .eq('tenant_id', msg.tenant_id)
  .eq('connection_status', 'connected')
  .single();

// DEPOIS: Suporta Super Admin (tenant_id NULL)
let instanceQuery = supabase
  .from('whatsapp_instances')
  .select('instance_name, zapi_instance_id, zapi_instance_token, zapi_client_token, user_id')
  .eq('connection_status', 'connected');

if (msg.tenant_id === null) {
  instanceQuery = instanceQuery.is('tenant_id', null);
} else {
  instanceQuery = instanceQuery.eq('tenant_id', msg.tenant_id);
}

const { data: instance } = await instanceQuery.single();
```

---

### Etapa 3: Normalização do Telefone

**No formulário da HomePage:**

O telefone será normalizado com prefixo `55` antes de salvar:

```typescript
// Antes de salvar
const normalizedPhone = formData.whatsapp
  ? '55' + formData.whatsapp.replace(/\D/g, '')
  : undefined;
```

**Formato no banco:** `5545988083583` (sem +, sem espaços)

---

### Arquitetura Final

```text
┌─────────────────────────────────────────────────────────────────┐
│                    LANDING PAGE (vouti.co/)                     │
│         Lead preenche: Nome, Email, WhatsApp, Tamanho          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ INSERT com telefone normalizado
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRIGGER: tr_landing_leads_whatsapp                 │
│     Função: notify_whatsapp_landing_lead()                      │
│     Busca triggers onde tenant_id IS NULL (Super Admin)         │
│     Insere em whatsapp_pending_messages                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ INSERT na fila
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: whatsapp-process-queue              │
│     Executa via CRON (1 minuto) ou chamada manual               │
│     Busca instância: tenant_id IS NULL                          │
│     Envia via Z-API usando credenciais do Super Admin           │
│     Salva em whatsapp_messages                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              CAIXA DE ENTRADA SUPER ADMIN                       │
│     Filtra: tenant_id IS NULL                                   │
│     Mostra conversas com leads da landing                       │
│     Lead responde → IA (Gemini) processa e responde             │
└─────────────────────────────────────────────────────────────────┘
```

---

### Resumo das Alterações

| Componente | Arquivo | Alteração |
|------------|---------|-----------|
| **Banco** | Migração SQL | Permitir `tenant_id NULL` nas tabelas |
| **Banco** | Migração SQL | Atualizar função do trigger com normalização |
| **Banco** | Migração SQL | Inserir trigger do Super Admin |
| **Edge Function** | `whatsapp-process-queue/index.ts` | Suportar busca de instância com `tenant_id IS NULL` |
| **Frontend** | `src/pages/HomePage.tsx` | Normalizar telefone com prefixo `55` |

---

### Formato do Telefone

| Entrada do usuário | Salvo no banco | Enviado para Z-API |
|--------------------|----------------|-------------------|
| `45 98808-3583` | `5545988083583` | `5545988083583` |
| `(45) 98808-3583` | `5545988083583` | `5545988083583` |
| `988083583` | `55988083583` | `55988083583` |

A Z-API espera o formato `55XXXXXXXXXXX` sem o `+`.

---

### Segurança e Isolamento

- Leads da landing page terão `tenant_id = NULL` na fila
- Mensagens enviadas terão `tenant_id = NULL` no histórico
- Caixa de entrada do Super Admin filtra `WHERE tenant_id IS NULL`
- Tenants continuam isolados com seus próprios `tenant_id`
- Sem interferência entre os sistemas

