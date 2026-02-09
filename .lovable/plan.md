

# Plano: Corrigir Atualização de Conversas e Resposta do Bot

## Problemas Identificados

### Problema 1: Mensagens salvas com `tenant_id` do tenant, não NULL para Super Admin

No banco de dados, TODAS as mensagens recentes estão com:
```
tenant_id: d395b3a1-1ea1-4710-bcc1-ff5f6a279750
```

O Super Admin busca com `.is("tenant_id", null)`, então **não encontra nenhuma mensagem**.

**Causa raiz:** O webhook busca a instância Z-API pelo `instanceId` e usa o `tenant_id` dessa instância:
```typescript
const { data: instance } = await supabase
  .from('whatsapp_instances')
  .select('user_id, tenant_id, zapi_url, zapi_token')
  .eq('instance_name', instanceId)  // instanceId = 3E8A7687638142678C80FA4754EC29F2
  .single();
```

A instância `3E8A7687638142678C80FA4754EC29F2` tem `tenant_id: d395b3a1-1ea1-4710-bcc1-ff5f6a279750` no banco.

### Problema 2: Bot não responde - Erro na Z-API

Nos logs:
```
❌ Erro Z-API: 400 { error: "your client-token is not configured" }
```

O webhook tenta enviar usando as credenciais da instância do banco (`instance.zapi_url`, `instance.zapi_token`), mas falta o header `Client-Token`.

**Código atual (errado):**
```typescript
const zapiUrl = `${instance.zapi_url}/token/${instance.zapi_token}/send-text`;
const response = await fetch(zapiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },  // FALTA Client-Token!
  body: JSON.stringify({...}),
});
```

**A Z-API requer o header `Client-Token`** para autenticação.

### Problema 3: IA está habilitada mas verifica tenant errado

A IA está configurada com `tenant_id: NULL` (Super Admin), mas o webhook verifica IA baseado no `tenant_id` da instância (que é `d395b3a1-...`).

Como a config IA tem `tenant_id: NULL` e o webhook busca onde `tenant_id = 'd395b3a1-...'`, não encontra e diz:
```
⏭️ IA não habilitada para este tenant
```

## Soluções

### 1. Corrigir lógica de tenant_id no webhook

O problema é que a instância Z-API tem um `tenant_id` fixo, mas ela é COMPARTILHADA entre Super Admin e tenants.

Precisamos determinar se a mensagem é para o Super Admin baseado em OUTRA lógica:
- Se a instância usa credenciais globais (`whatsapp-bot`) → Super Admin
- Se a instância NÃO tem `tenant_id` → Super Admin
- Caso contrário → Tenant específico

### 2. Adicionar header `Client-Token` nas chamadas Z-API do webhook

Atualmente o webhook usa a URL com token no path, mas a Z-API espera o token no header.

**Corrigir de:**
```typescript
const zapiUrl = `${instance.zapi_url}/token/${instance.zapi_token}/send-text`;
const response = await fetch(zapiUrl, {
  headers: { 'Content-Type': 'application/json' },
  ...
});
```

**Para:**
```typescript
const zapiUrl = `${instance.zapi_url}/send-text`;
const response = await fetch(zapiUrl, {
  headers: { 
    'Content-Type': 'application/json',
    'Client-Token': instance.zapi_token  // ADICIONAR!
  },
  ...
});
```

### 3. Corrigir verificação de IA habilitada

Quando a instância é do Super Admin (sem tenant_id ou instância global), verificar IA com `tenant_id IS NULL`.

## Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  WEBHOOK RECEBE MENSAGEM                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Buscar instância pelo instanceId                                       │
│                                                                             │
│   2. DETERMINAR se é Super Admin:                                           │
│      - instance.tenant_id é NULL? → Super Admin                             │
│      - instance usa credenciais globais? → Super Admin                      │
│      - Caso contrário → Tenant                                              │
│                                                                             │
│   3. SALVAR mensagem:                                                       │
│      - Super Admin: tenant_id = NULL                                        │
│      - Tenant: tenant_id = instance.tenant_id                               │
│                                                                             │
│   4. VERIFICAR IA:                                                          │
│      - Usar o tenant_id EFETIVO (NULL ou específico)                        │
│                                                                             │
│   5. ENVIAR resposta com Client-Token:                                      │
│      headers: { 'Client-Token': instance.zapi_token }                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | 1. Adicionar `Client-Token` header 2. Corrigir lógica tenant_id |

## Alterações Detalhadas

### 1. Adicionar `Client-Token` nas requisições Z-API

**Linha ~214 (automação):**
```typescript
// ANTES
headers: { 'Content-Type': 'application/json' }

// DEPOIS
headers: { 
  'Content-Type': 'application/json',
  'Client-Token': instance.zapi_token || ''
}
```

**Linha ~329 (resposta IA):**
```typescript
// ANTES
headers: { 'Content-Type': 'application/json' }

// DEPOIS
headers: { 
  'Content-Type': 'application/json',
  'Client-Token': zapi_token || ''
}
```

### 2. Corrigir lógica de tenant_id

O arquivo precisa ser ajustado para:

1. Buscar a instância com suas credenciais Z-API
2. Determinar `effectiveTenantId`:
   - Se `instance.tenant_id` for NULL → NULL (Super Admin)
   - Se instância usa credenciais globais → NULL (Super Admin)
   - Caso contrário → `instance.tenant_id`
3. Usar `effectiveTenantId` para salvar mensagens E verificar IA

### 3. Passar `zapi_token` para função de IA

A função `handleAIResponse` precisa receber o token para adicionar o header correto.

## Problema da Instância Compartilhada

Atualmente, a instância `3E8A7687638142678C80FA4754EC29F2` está cadastrada com:
- `tenant_id: d395b3a1-1ea1-4710-bcc1-ff5f6a279750` (SOLVENZA)

Isso significa que TODAS as mensagens recebidas por essa instância são associadas ao tenant SOLVENZA, não ao Super Admin.

**Opções:**
1. **Alterar o tenant_id da instância para NULL** no banco (para ser usada pelo Super Admin)
2. **Criar uma nova instância para o Super Admin** com tenant_id NULL
3. **Usar as credenciais globais (secrets)** para o Super Admin em vez de buscar no banco

A opção mais simples é ajustar o código para que, quando o Super Admin enviar mensagens (mode: 'superadmin'), as respostas também sejam tratadas como Super Admin.

## Resultado Esperado

Após as correções:
1. Mensagens do lead serão salvas com `tenant_id` correto (NULL para Super Admin)
2. O inbox do Super Admin mostrará as conversas
3. O bot responderá corretamente (com `Client-Token` no header)
4. A IA será ativada quando configurada para o tenant correto

