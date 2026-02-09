

## Plano: Correção Completa do Sistema de Chat WhatsApp

### Problema Raiz Identificado

O webhook `whatsapp-webhook` busca a instância pelo campo `instance_name`, mas o valor que chega do Z-API (ex: `3E8A7687638142678C80FA4754EC29F2`) **não corresponde** ao que está salvo no banco (ex: `superadmin-{agentId}` ou `tenant-{tenantId}-{agentId}`).

**Log do erro:**
```
ERROR Instance not found or no user_id: {
  code: "PGRST116",
  message: "Cannot coerce the result to a single JSON object"
}
```

**Análise do banco:**
- `whatsapp_instances`: **VAZIA** (0 registros)
- `whatsapp_agents`: 3 agentes criados (Admin, Daniel, Juliana)
- `whatsapp_messages`: Mensagens antigas existem (funcionou antes)
- `whatsapp_ai_config`: Configuração IA ativa (Gemini configurado)

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-webhook/index.ts` | Alterar busca de `instance_name` para `zapi_instance_id` |

---

### Mudança Principal no Webhook

**ANTES (linha 124-128):**
```typescript
const { data: instance, error: instanceError } = await supabase
  .from('whatsapp_instances')
  .select('user_id, tenant_id, zapi_url, zapi_token, zapi_instance_id, zapi_instance_token, zapi_client_token')
  .eq('instance_name', instanceId)  // ❌ Busca pelo instance_name
  .single();
```

**DEPOIS:**
```typescript
const { data: instance, error: instanceError } = await supabase
  .from('whatsapp_instances')
  .select('user_id, tenant_id, zapi_url, zapi_token, zapi_instance_id, zapi_instance_token, zapi_client_token, instance_name')
  .eq('zapi_instance_id', instanceId)  // ✅ Busca pelo zapi_instance_id (ID real da Z-API)
  .single();
```

---

### Fluxo Corrigido

```text
1. Lead envia mensagem para o número conectado
         ↓
2. Z-API envia webhook com instanceId: "3E8A7687638142678C80FA4754EC29F2"
         ↓
3. Webhook busca: WHERE zapi_instance_id = "3E8A7687638142678C80FA4754EC29F2"
         ↓
4. Encontra a instância com tenant_id, user_id, credenciais
         ↓
5. Salva mensagem recebida no banco (aparece na caixa de entrada)
         ↓
6. Chama whatsapp-ai-chat → Gemini gera resposta
         ↓
7. Salva resposta no banco (aparece na UI)
         ↓
8. Envia resposta via Z-API usando credenciais da instância
         ↓
9. Lead recebe resposta no WhatsApp
```

---

### Pré-requisito: Recriar Instância no Banco

Antes de testar, o usuário precisa:
1. Acessar a configuração do agente (Super Admin ou Tenant)
2. Preencher as credenciais Z-API (Instance ID, Token, Client Token)
3. Clicar em "Salvar" para criar o registro em `whatsapp_instances`

Isso criará um registro com:
- `instance_name`: identificador interno único
- `zapi_instance_id`: ID real da Z-API (usado para busca no webhook)
- `zapi_instance_token`: Token para autenticação
- `agent_id`: Vinculado ao agente
- `tenant_id`: NULL para Super Admin, ou UUID do tenant

---

### Validação do Polling (Já Correto)

Os componentes de inbox já possuem polling de 2 segundos:
- `WhatsAppInbox.tsx`: Linhas 149-173 (useCallback + useEffect com interval)
- `SuperAdminWhatsAppInbox.tsx`: Linhas 132-154 (mesmo padrão)

---

### Resultado Esperado

Após a correção:
1. Webhook encontra a instância correta pelo `zapi_instance_id`
2. Mensagens recebidas são salvas com `tenant_id` correto
3. IA processa e responde automaticamente
4. Caixa de entrada atualiza a cada 2 segundos
5. Todas as mensagens (entrada e saída) aparecem em tempo real

