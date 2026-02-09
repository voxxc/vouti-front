
## Plano: Integração Completa do Agente IA + Atualização da Caixa de Entrada

### Contexto

O sistema atual do Vouti.Bot tem a lógica de IA implementada no `whatsapp-webhook`, mas há um problema crítico: **as respostas da IA estão sendo enviadas usando credenciais GLOBAIS** (`Z_API_URL`, `Z_API_TOKEN`) em vez das credenciais **específicas de cada agente/instância** (`zapi_instance_id`, `zapi_instance_token`, `zapi_client_token`).

Isso faz com que as respostas funcionem apenas se a instância global estiver configurada corretamente, ignorando a configuração individual de cada agente.

---

### Arquivos a Serem Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-webhook/index.ts` | **Atualizar** para usar credenciais específicas da instância |

---

### Mudanças Detalhadas

#### 1. Atualizar busca de credenciais da instância

Alterar a query que busca a instância para incluir os novos campos:

```text
ANTES:
.select('user_id, tenant_id, zapi_url, zapi_token')

DEPOIS:
.select('user_id, tenant_id, zapi_url, zapi_token, zapi_instance_id, zapi_instance_token, zapi_client_token')
```

#### 2. Modificar `handleAIResponse` para receber credenciais da instância

A função atualmente usa apenas secrets globais. Precisamos:
- Passar as credenciais da instância como parâmetro
- Construir a URL Z-API usando o padrão: `https://api.z-api.io/instances/{instance_id}/token/{instance_token}`
- Usar `zapi_client_token` como header `Client-Token`
- Manter fallback para secrets globais caso credenciais específicas não existam

#### 3. Atualizar a assinatura da função `handleAIResponse`

```text
ANTES:
async function handleAIResponse(
  phone: string, 
  message: string, 
  tenant_id: string | null, 
  instanceId: string,
  user_id: string
): Promise<boolean>

DEPOIS:
async function handleAIResponse(
  phone: string, 
  message: string, 
  tenant_id: string | null, 
  instanceId: string,
  user_id: string,
  instanceCredentials: {
    zapi_instance_id?: string;
    zapi_instance_token?: string;
    zapi_client_token?: string;
  }
): Promise<boolean>
```

#### 4. Lógica de resolução de credenciais no envio da resposta IA

```text
// PRIORIDADE 1: Credenciais específicas da instância
if (instanceCredentials.zapi_instance_id && instanceCredentials.zapi_instance_token) {
  baseUrl = `https://api.z-api.io/instances/${instanceCredentials.zapi_instance_id}/token/${instanceCredentials.zapi_instance_token}`;
  clientToken = instanceCredentials.zapi_client_token || Deno.env.get('Z_API_TOKEN');
} 
// PRIORIDADE 2: Fallback para secrets globais
else {
  baseUrl = Deno.env.get('Z_API_URL');
  clientToken = Deno.env.get('Z_API_TOKEN');
}
```

---

### Verificação da Caixa de Entrada

| Componente | Status do Polling 2s |
|------------|---------------------|
| `WhatsAppInbox.tsx` (Tenant) | ✅ Já implementado (linhas 149-173) |
| `SuperAdminWhatsAppInbox.tsx` | ✅ Já implementado (linhas 132-154) |

Ambas as caixas de entrada já possuem o polling de 2 segundos para atualizar conversas e mensagens.

---

### Fluxo Final do Agente IA

```text
1. Lead envia mensagem WhatsApp
          ↓
2. Z-API envia webhook para whatsapp-webhook
          ↓
3. Webhook salva mensagem recebida no banco
          ↓
4. handleAIResponse() verifica:
   - IA desabilitada para contato? → Sai
   - IA habilitada para tenant? → Continua
          ↓
5. Chama whatsapp-ai-chat Edge Function
   - Busca system_prompt do whatsapp_ai_config
   - Busca histórico de mensagens do lead
   - Envia para Lovable AI Gateway (Gemini)
          ↓
6. Resposta IA recebida
          ↓
7. Salva resposta no whatsapp_messages (aparece na UI)
          ↓
8. Envia via Z-API usando CREDENCIAIS DA INSTÂNCIA
   - Constrói URL: https://api.z-api.io/instances/{id}/token/{token}
   - Header: Client-Token (específico ou fallback global)
          ↓
9. Lead recebe resposta no WhatsApp
```

---

### Resultado Esperado

- **Resposta automática funcional**: Quando um lead envia mensagem, o Agente IA lê, processa com Gemini e responde automaticamente via WhatsApp
- **Credenciais corretas**: Cada agente usa suas próprias credenciais Z-API, não depende de secrets globais
- **Atualização em tempo real**: As respostas aparecem na caixa de entrada em até 2 segundos (polling já existente)
- **Isolamento multi-tenant**: Tenants usam seus próprios agentes e configs; Super Admin gerencia agentes globais (landing page)
