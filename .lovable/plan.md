

## Integracao da API Oficial Meta WhatsApp Cloud

### Conceito

Adicionar a API Oficial do Meta como **opcao alternativa** ao Z-API. Cada agente/instancia pode escolher entre "Z-API" ou "Meta WhatsApp" como provedor. A arquitetura existente ja suporta isso bem - basta adicionar um campo `provider` na tabela `whatsapp_instances` e rotear as chamadas no backend.

### O que o seu cliente (tenant) precisa fazer por conta propria

1. Criar uma conta Meta Business (business.facebook.com)
2. Criar um App no Meta Developers (developers.facebook.com)
3. Ativar o produto "WhatsApp" no app
4. Obter: **Phone Number ID**, **Access Token** (permanente), **WABA ID**
5. Configurar o Webhook URL (fornecido pela sua plataforma) no painel Meta

### O que a plataforma fornece

- UI para o tenant colar suas credenciais Meta (Phone Number ID, Access Token)
- Webhook endpoint para receber mensagens do Meta
- Envio de mensagens pela Cloud API do Meta
- Tudo isolado por tenant, como ja funciona com Z-API

---

### Etapa 1: Migracao do Banco de Dados

Adicionar colunas na tabela `whatsapp_instances`:

```text
ALTER TABLE whatsapp_instances
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'zapi',
  ADD COLUMN meta_phone_number_id TEXT,
  ADD COLUMN meta_access_token TEXT,
  ADD COLUMN meta_waba_id TEXT,
  ADD COLUMN meta_business_id TEXT,
  ADD COLUMN meta_verify_token TEXT;
```

- `provider`: 'zapi' ou 'meta' - determina qual API usar
- `meta_phone_number_id`: ID do numero no Meta
- `meta_access_token`: Token permanente do Meta
- `meta_waba_id`: WhatsApp Business Account ID
- `meta_verify_token`: Token para verificacao do webhook Meta

### Etapa 2: Edge Function - whatsapp-meta-webhook

Nova Edge Function para receber callbacks do Meta. Formato diferente do Z-API:

- Meta envia POST com `entry[].changes[].value.messages[]`
- Normalizar para o mesmo formato interno (from_number, message_text, direction)
- Resolver instancia pelo `meta_phone_number_id` do payload
- Reusar toda a logica de IA, automacoes e salvamento existente

Endpoint: `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-meta-webhook`

O tenant cola essa URL no painel do Meta Developers como Webhook URL.

Tambem tratara a verificacao GET do Meta (challenge verification).

### Etapa 3: Modificar whatsapp-send-message

Adicionar roteamento por provider:

```text
// Buscar instancia com provider
const instance = await getInstanceForAgent(tenantId, agentId);

if (instance.provider === 'meta') {
  // Enviar via Meta Cloud API
  const metaUrl = `https://graph.facebook.com/v21.0/${instance.meta_phone_number_id}/messages`;
  await fetch(metaUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${instance.meta_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message }
    })
  });
} else {
  // Enviar via Z-API (codigo atual)
}
```

### Etapa 4: UI - Aba de Provedor no AgentConnectionTab

No `WhatsAppAgentsSettings.tsx`, adicionar selector de provedor na aba de conexao:

```text
Provedor: [Z-API] [Meta WhatsApp]
```

- Se **Z-API** selecionado: mostra formulario atual (Instance ID, Token, Client-Token)
- Se **Meta** selecionado: mostra formulario diferente:
  - Phone Number ID
  - Access Token (permanente)
  - WABA ID
  - Webhook URL (read-only, para o tenant copiar e colar no Meta)
  - Verify Token (gerado automaticamente)
  - Botao "Verificar Conexao" (chama Meta API para checar status)

### Etapa 5: Modificar whatsapp-zapi-action

Renomear conceptualmente para suportar ambos provedores. Quando `provider === 'meta'`:
- `status`: GET `https://graph.facebook.com/v21.0/{phone_number_id}` com token
- `disconnect`: Nao aplicavel (Meta nao tem conceito de desconectar QR)
- `qr-code`: Nao aplicavel (Meta nao usa QR code - a conexao e via Business API)

### Etapa 6: Webhook AI e Debounce

O `whatsapp-meta-webhook` reutilizara a mesma funcao `handleAIResponse` extraida. Ambos os webhooks (Z-API e Meta) convergem no mesmo fluxo de IA apos normalizar a mensagem.

---

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| Migration SQL | Adicionar colunas provider, meta_* na whatsapp_instances |
| `supabase/functions/whatsapp-meta-webhook/index.ts` | NOVO - Webhook para receber mensagens do Meta |
| `supabase/functions/whatsapp-send-message/index.ts` | Roteamento por provider (zapi vs meta) |
| `supabase/functions/whatsapp-zapi-action/index.ts` | Suportar acoes Meta (status check) |
| `supabase/functions/whatsapp-webhook/index.ts` | Extrair funcoes compartilhadas |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Selector de provedor + formulario Meta |
| `supabase/config.toml` | Registrar nova edge function |

### Experiencia do Tenant

1. Admin do tenant acessa Vouti.CRM > Agentes > Clica no agente
2. Na aba "Conexao", seleciona provedor: **Meta WhatsApp**
3. Cola Phone Number ID e Access Token (obtidos do Meta Developers)
4. Copia a Webhook URL exibida e cola no painel Meta
5. Clica "Verificar Conexao" - sistema confirma se o token e valido
6. Pronto - mensagens comecam a fluir pela API oficial

