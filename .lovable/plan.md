

## Plano: Vincular Agentes às Landing Pages (Tenants)

### Contexto

Os tenants possuem landing pages próprias que salvam leads na tabela `leads_captacao` com a coluna `origem`:
- `landing_page_1` - Rota `/landing-1`
- `landing_page_2` - Rota `/office`

Atualmente, não há automação de WhatsApp para leads dessas páginas. Precisamos criar uma solução minimalista para que o tenant escolha qual agente vai atender cada landing page.

---

### Solução Proposta

Adicionar um campo simples na aba "Comportamento da IA" do agente (dos tenants) que permite selecionar qual landing page ele atenderá.

| Componente | Alteração |
|------------|-----------|
| **Banco de dados** | Adicionar coluna `landing_page_source TEXT` em `whatsapp_agents` |
| **Banco de dados** | Criar trigger `tr_leads_captacao_whatsapp` para automação |
| **Frontend** | Adicionar checkbox/select minimalista no `WhatsAppAISettings.tsx` |
| **Edge Function** | Ajustar busca para encontrar agente por `landing_page_source` |

---

### Etapa 1: Migração SQL

```sql
-- Adicionar campo para tenants escolherem landing page
ALTER TABLE public.whatsapp_agents
ADD COLUMN landing_page_source TEXT DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.whatsapp_agents.landing_page_source IS 
'Fonte de leads que este agente atende (landing_page_1 ou landing_page_2). NULL = não atende nenhuma.';
```

---

### Etapa 2: Trigger para `leads_captacao`

Criar uma função e trigger similar ao que existe para `landing_leads`:

```sql
CREATE OR REPLACE FUNCTION notify_whatsapp_captacao_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_agent RECORD;
  v_instance RECORD;
  v_message TEXT;
  v_phone TEXT;
BEGIN
  -- Normalizar telefone
  v_phone := REGEXP_REPLACE(NEW.telefone, '[^0-9]', '', 'g');
  IF LENGTH(v_phone) = 10 OR LENGTH(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- Buscar agente configurado para esta landing page no tenant
  SELECT wa.*, wi.zapi_instance_id, wi.connection_status
  INTO v_agent
  FROM whatsapp_agents wa
  LEFT JOIN whatsapp_instances wi ON wi.agent_id = wa.id
  WHERE wa.tenant_id = NEW.tenant_id
    AND wa.landing_page_source = NEW.origem
    AND wa.is_active = TRUE
  LIMIT 1;

  -- Se encontrou agente configurado e conectado
  IF v_agent.id IS NOT NULL AND v_agent.connection_status = 'connected' THEN
    -- Buscar configuração de trigger (mensagem de boas-vindas)
    SELECT * INTO v_instance
    FROM whatsapp_lead_triggers
    WHERE tenant_id = NEW.tenant_id
      AND lead_source = 'leads_captacao'
      AND is_active = TRUE
    LIMIT 1;

    IF v_instance.id IS NOT NULL THEN
      -- Preparar mensagem
      v_message := v_instance.welcome_message;
      v_message := REPLACE(v_message, '{{nome}}', COALESCE(NEW.nome, ''));
      v_message := REPLACE(v_message, '{{telefone}}', COALESCE(NEW.telefone, ''));
      v_message := REPLACE(v_message, '{{email}}', COALESCE(NEW.email, ''));

      -- Inserir na fila
      INSERT INTO whatsapp_pending_messages (
        tenant_id,
        trigger_id,
        lead_source,
        lead_id,
        phone,
        message,
        scheduled_at
      ) VALUES (
        NEW.tenant_id,
        v_instance.id,
        'leads_captacao',
        NEW.id,
        v_phone,
        v_message,
        NOW() + (v_instance.welcome_delay_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Criar trigger
CREATE TRIGGER tr_leads_captacao_whatsapp
  AFTER INSERT ON leads_captacao
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_captacao_lead();
```

---

### Etapa 3: Interface Minimalista

Na aba "Comportamento da IA" (apenas para tenants), adicionar:

```
┌──────────────────────────────────────────────────────────────┐
│  Landing Page                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Selecione a página                              ▼      │ │
│  └─────────────────────────────────────────────────────────┘ │
│  Ao marcar, leads dessa página serão atendidos por este     │
│  agente.                                                     │
└──────────────────────────────────────────────────────────────┘

Opções do Select:
- Nenhuma
- Landing Page 1 (/landing-1)
- Landing Page 2 (/office)
```

**Visual minimalista**: Um único select discreto, sem cards extras.

---

### Etapa 4: Atualizar `WhatsAppAISettings.tsx`

```tsx
// Adicionar estado
const [landingPageSource, setLandingPageSource] = useState<string | null>(null);

// No loadConfig, carregar do agente
if (!isSuperAdmin && agentId) {
  const { data: agentData } = await supabase
    .from('whatsapp_agents')
    .select('landing_page_source')
    .eq('id', agentId)
    .single();
  
  if (agentData) {
    setLandingPageSource(agentData.landing_page_source);
  }
}

// Função para atualizar
const handleLandingPageChange = async (value: string | null) => {
  const actualValue = value === 'none' ? null : value;
  
  // Se for selecionar uma página, desmarcar outros agentes
  if (actualValue) {
    await supabase
      .from('whatsapp_agents')
      .update({ landing_page_source: null })
      .eq('tenant_id', tenantId)
      .eq('landing_page_source', actualValue);
  }

  await supabase
    .from('whatsapp_agents')
    .update({ landing_page_source: actualValue })
    .eq('id', agentId);

  setLandingPageSource(actualValue);
};
```

---

### Etapa 5: Atualizar Edge Function

Ajustar `whatsapp-process-queue` para buscar a instância correta baseado no agente:

```typescript
// Para leads_captacao de tenants
if (msg.lead_source === 'leads_captacao' && msg.tenant_id) {
  // Buscar agente configurado para esta origem
  const { data: lead } = await supabase
    .from('leads_captacao')
    .select('origem')
    .eq('id', msg.lead_id)
    .single();

  instanceQuery = supabase
    .from('whatsapp_instances')
    .select(`
      instance_name, 
      zapi_instance_id, 
      zapi_instance_token, 
      zapi_client_token,
      agent_id,
      whatsapp_agents!inner(landing_page_source)
    `)
    .eq('tenant_id', msg.tenant_id)
    .eq('connection_status', 'connected')
    .eq('whatsapp_agents.landing_page_source', lead?.origem);
}
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `Nova migração SQL` | Adicionar coluna `landing_page_source` e trigger |
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Adicionar select de landing page para tenants |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Passar `agentId` para WhatsAppAISettings |
| `supabase/functions/whatsapp-process-queue/index.ts` | Buscar instância por `landing_page_source` |

---

### Fluxo Completo

```text
LEAD ENTRA NA LANDING PAGE 1
origem = "landing_page_1"
        │
        ▼
┌──────────────────────────────────────┐
│  INSERT em leads_captacao            │
│  tenant_id = "abc123"                │
│  origem = "landing_page_1"           │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  TRIGGER: notify_whatsapp_captacao_lead │
│                                       │
│  1. Busca agente onde:               │
│     tenant_id = "abc123"             │
│     landing_page_source = "landing_page_1" │
│  2. Se encontrar, insere na fila     │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  whatsapp-process-queue              │
│  Envia mensagem via Z-API            │
│  Usa credenciais do agente correto   │
└──────────────────────────────────────┘
```

---

### Diferenças Super Admin vs Tenants

| Aspecto | Super Admin | Tenants |
|---------|-------------|---------|
| Campo | Checkbox `is_landing_agent` | Select `landing_page_source` |
| Tabela fonte | `landing_leads` | `leads_captacao` |
| Estilo | Card destacado | Select minimalista |
| Opções | Única (homepage vouti.co/) | Múltiplas (landing-1, office) |

---

### Benefícios

- **Minimalista**: Um único select discreto
- **Flexível**: Cada agente pode atender uma landing específica
- **Escalável**: Fácil adicionar novas landing pages no futuro
- **Isolado**: Não afeta a lógica do Super Admin

