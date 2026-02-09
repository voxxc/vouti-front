

## Plano: Automação e Configuração da Mensagem Inicial para Leads da Homepage

### Resumo

Implementar duas melhorias no sistema de automação de leads:

1. **Cron Job**: Criar processamento automático da fila a cada 1 minuto
2. **UI Integrada**: Ao ativar o checkbox "Agente da Homepage", exibir automaticamente um campo para configurar a mensagem inicial de boas-vindas

---

### Problema Atual

| Aspecto | Situação |
|---------|----------|
| Delay configurado | `0 minutos` (imediato) |
| Fila de mensagens | Funciona, mas precisa de chamada manual |
| Cron Job | **Não existe** - mensagens ficam paradas na fila |
| UX da mensagem | Configuração separada do checkbox |

---

### Solução

#### Parte 1: Cron Job para Processamento Automático

Habilitar extensões `pg_cron` e `pg_net` e criar um job que chama a edge function a cada minuto:

```sql
-- Habilitar extensões (se ainda não estiverem)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o cron job
SELECT cron.schedule(
  'whatsapp-process-queue-every-minute',
  '* * * * *',  -- A cada minuto
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-process-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

#### Parte 2: Interface de Mensagem Inicial Integrada

Quando o Super Admin marcar o checkbox "Agente da Homepage", um campo de texto aparece logo abaixo para configurar a mensagem de boas-vindas:

```
┌──────────────────────────────────────────────────────────────┐
│  [✓] Agente da Homepage                                      │
│      Este agente responderá os leads da homepage vouti.co/   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Mensagem de Boas-Vindas                               │  │
│  │  ────────────────────────────────────────────────────  │  │
│  │  👋 Olá, {{nome}}!                                     │  │
│  │                                                        │  │
│  │  Sou o agente virtual da VOUTI. Vi que você acabou    │  │
│  │  de conhecer nossa plataforma!                         │  │
│  │                                                        │  │
│  │  Como posso ajudar você hoje?                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Variáveis disponíveis:                                       │
│  {{nome}} {{email}} {{telefone}} {{tamanho_escritorio}}       │
│                                                               │
│  Após esta mensagem, a IA assume a conversa.                  │
└──────────────────────────────────────────────────────────────┘
```

---

### Componentes a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `SQL Insert (cron job)` | Criar cron job para processar fila |
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Adicionar campo de mensagem ao ativar checkbox |

---

### Etapa 1: Criar Cron Job

O cron job será inserido diretamente via SQL no Supabase Dashboard (não via migração, pois contém dados específicos como a anon key).

---

### Etapa 2: Atualizar WhatsAppAISettings.tsx

Modificar o componente para:

1. Carregar a mensagem de boas-vindas do `whatsapp_lead_triggers` quando carregar o agente
2. Quando o checkbox estiver marcado, mostrar um Textarea para editar a mensagem
3. Salvar a mensagem na tabela `whatsapp_lead_triggers` junto com a flag do checkbox

```tsx
// Novo estado
const [welcomeMessage, setWelcomeMessage] = useState("");

// No loadConfig - carregar trigger existente
if (isSuperAdmin && agentId) {
  const { data: triggerData } = await supabase
    .from('whatsapp_lead_triggers')
    .select('*')
    .is('tenant_id', null)
    .eq('lead_source', 'landing_leads')
    .maybeSingle();
  
  if (triggerData) {
    setWelcomeMessage(triggerData.welcome_message || '');
  }
}

// No handleLandingAgentChange - criar/atualizar trigger
const handleLandingAgentChange = async (checked: boolean) => {
  // ... código existente ...
  
  if (checked) {
    // Criar ou atualizar trigger de boas-vindas
    await supabase
      .from('whatsapp_lead_triggers')
      .upsert({
        tenant_id: null,
        lead_source: 'landing_leads',
        welcome_message: welcomeMessage || DEFAULT_WELCOME,
        welcome_delay_minutes: 0,
        is_active: true
      }, { onConflict: 'tenant_id,lead_source' });
  }
};

// Função para salvar mensagem
const handleSaveWelcomeMessage = async () => {
  await supabase
    .from('whatsapp_lead_triggers')
    .update({ welcome_message: welcomeMessage })
    .is('tenant_id', null)
    .eq('lead_source', 'landing_leads');
};
```

---

### Etapa 3: UI do Campo de Mensagem

Adicionar ao componente, logo após o Card do checkbox:

```tsx
{/* Campo de Mensagem de Boas-Vindas (aparece quando is_landing_agent = true) */}
{isSuperAdmin && agentId && isLandingAgent && (
  <Card className="border-primary/50">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Mensagem de Boas-Vindas
      </CardTitle>
      <CardDescription>
        Esta é a primeira mensagem enviada automaticamente ao lead.
        Após o lead responder, a IA assumirá a conversa.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Textarea
        value={welcomeMessage}
        onChange={(e) => setWelcomeMessage(e.target.value)}
        placeholder="Ex: Olá {{nome}}! Bem-vindo à Vouti..."
        className="min-h-[150px]"
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-muted rounded">{"{{nome}}"}</span>
        <span className="px-2 py-1 bg-muted rounded">{"{{email}}"}</span>
        <span className="px-2 py-1 bg-muted rounded">{"{{telefone}}"}</span>
        <span className="px-2 py-1 bg-muted rounded">{"{{tamanho_escritorio}}"}</span>
      </div>
      <Button onClick={handleSaveWelcomeMessage} size="sm">
        <Save className="h-4 w-4 mr-2" />
        Salvar Mensagem
      </Button>
    </CardContent>
  </Card>
)}
```

---

### Fluxo Completo após Implementação

```
LEAD PREENCHE FORMULÁRIO
        │
        ▼
┌──────────────────────────────────────┐
│  INSERT em landing_leads             │
│  Trigger insere na fila com delay 0  │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  CRON JOB (a cada 1 minuto)          │
│  Chama whatsapp-process-queue        │
│  → Envia mensagem de boas-vindas     │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  LEAD RECEBE MENSAGEM NO WHATSAPP    │
│  "👋 Olá, João! Sou o agente..."     │
│                                       │
│  Lead responde...                    │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  WEBHOOK recebe resposta do lead     │
│  AI Agent responde automaticamente   │
│  → Continua conversa e marca reunião │
└──────────────────────────────────────┘
```

---

### Tempo de Envio Esperado

| Antes | Depois |
|-------|--------|
| Nunca (sem cron) | 0-60 segundos |

O cron roda a cada minuto. Se o lead preencher o formulário às 14:00:30, a mensagem será enviada no próximo ciclo (14:01:00), ou seja, máximo 60 segundos de espera.

---

### Benefícios

| Aspecto | Melhoria |
|---------|----------|
| **Velocidade** | Mensagem enviada em até 60 segundos |
| **UX Admin** | Campo de mensagem aparece junto ao checkbox |
| **Configuração** | Tudo em um lugar só |
| **Automação** | Funciona 24/7 sem intervenção |

---

### Arquivos a Modificar

1. **SQL Insert** (via Dashboard Supabase) - Criar cron job
2. `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` - Adicionar campo de mensagem integrado ao checkbox

