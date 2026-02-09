

## Plano: Checkbox "Atender Leads da Homepage" (Super Admin)

### Ideia

Adicionar um campo `is_landing_agent` na tabela `whatsapp_agents` que, quando marcado, indica que aquele agente específico será responsável por atender os leads que chegam da homepage (vouti.co/).

Isso permite que o Super Admin tenha múltiplos agentes para diferentes finalidades:
- **Agente Landing Page** (checkbox marcado): Atende leads da homepage automaticamente
- **Agentes para Demos**: Podem ser usados para demonstrações para clientes
- **Agentes de Teste**: Para testar configurações sem afetar a produção

---

### Arquitetura da Solução

| Componente | Alteração |
|------------|-----------|
| **Banco de dados** | Adicionar coluna `is_landing_agent BOOLEAN DEFAULT FALSE` em `whatsapp_agents` |
| **Trigger do banco** | Atualizar `notify_whatsapp_landing_lead()` para buscar a instância do agente marcado |
| **Frontend** | Adicionar checkbox na aba "Comportamento da IA" do Super Admin |
| **Edge Function** | Atualizar `whatsapp-process-queue` para usar o agente correto |

---

### Etapa 1: Migração SQL

```sql
-- Adicionar coluna is_landing_agent
ALTER TABLE public.whatsapp_agents
ADD COLUMN is_landing_agent BOOLEAN DEFAULT FALSE;

-- Garantir que apenas UM agente do Super Admin pode ser o landing agent
CREATE UNIQUE INDEX unique_landing_agent_superadmin 
ON public.whatsapp_agents (is_landing_agent) 
WHERE tenant_id IS NULL AND is_landing_agent = TRUE;

-- Comentário explicativo
COMMENT ON COLUMN public.whatsapp_agents.is_landing_agent IS 
'Indica se este agente é responsável por atender leads da homepage (apenas para Super Admin)';
```

---

### Etapa 2: Atualizar Trigger do Banco

A função `notify_whatsapp_landing_lead()` atualmente busca qualquer instância conectada do Super Admin. Precisamos filtrar pelo agente marcado:

```sql
-- Na parte onde busca a instância para enviar a mensagem
-- Buscar instância do agente marcado como landing_agent
SELECT wi.* INTO v_instance
FROM whatsapp_instances wi
JOIN whatsapp_agents wa ON wa.id = wi.agent_id
WHERE wi.connection_status = 'connected'
  AND wi.tenant_id IS NULL
  AND wa.is_landing_agent = TRUE
LIMIT 1;
```

---

### Etapa 3: Interface do Checkbox

Na aba "Comportamento da IA" do Super Admin, adicionar:

```
┌──────────────────────────────────────────────────────────────┐
│  ☑️ Agente da Homepage                                        │
│                                                               │
│  Quando marcado, este agente será responsável por atender    │
│  automaticamente os leads que chegam da homepage vouti.co/   │
│                                                               │
│  ⚠️ Apenas um agente pode ter esta opção ativada             │
└──────────────────────────────────────────────────────────────┘
```

O checkbox só aparecerá para agentes do Super Admin (não para Tenants).

---

### Etapa 4: Lógica no Edge Function

Atualizar `whatsapp-process-queue/index.ts`:

```typescript
// Para Super Admin (tenant_id NULL), buscar instância do agente landing
if (msg.tenant_id === null) {
  instanceQuery = supabase
    .from('whatsapp_instances')
    .select(`
      instance_name, 
      zapi_instance_id, 
      zapi_instance_token, 
      zapi_client_token, 
      user_id,
      whatsapp_agents!inner(is_landing_agent)
    `)
    .eq('connection_status', 'connected')
    .is('tenant_id', null)
    .eq('whatsapp_agents.is_landing_agent', true);
}
```

---

### Fluxo Atualizado

```text
LEAD ENTRA NA HOMEPAGE
        │
        ▼
┌──────────────────────────────────────┐
│  Trigger: notify_whatsapp_landing_lead │
│  Insere em whatsapp_pending_messages   │
│  com tenant_id = NULL                  │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  Edge: whatsapp-process-queue        │
│                                       │
│  1. Detecta tenant_id = NULL          │
│  2. Busca agente com is_landing_agent │
│  3. Usa credenciais desse agente      │
│  4. Envia mensagem via Z-API          │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  Agente "Admin" ou "Vouti Bot"       │
│  (marcado como Landing Agent)         │
│  Responde automaticamente via IA      │
└──────────────────────────────────────┘
```

---

### Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Organização** | Múltiplos agentes com propósitos distintos |
| **Flexibilidade** | Trocar o agente da homepage sem reconfigurar tudo |
| **Controle** | Apenas um agente ativo por vez para a homepage |
| **Escalabilidade** | Preparado para futuros agentes especializados |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `Nova migração SQL` | Adicionar coluna e índice único |
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Adicionar checkbox + prop `agentId` |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` | Passar `agentId` para o componente |
| `supabase/functions/whatsapp-process-queue/index.ts` | Filtrar por `is_landing_agent` |

---

### Validação de Unicidade

O índice único garante que apenas **um** agente do Super Admin pode ser marcado como `is_landing_agent = TRUE`. Se o usuário tentar marcar outro agente:
1. O sistema desmarca automaticamente o anterior
2. Ou exibe mensagem de erro pedindo para desmarcar o anterior primeiro

---

### Dados Atuais

O Super Admin já possui 2 agentes:
- **Admin** (tenant_id NULL)
- **Atendente** (tenant_id NULL)

Após a implementação, você poderá escolher qual deles atenderá a homepage.

