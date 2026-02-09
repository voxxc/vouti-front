
# Plano: Reestruturar Integração Z-API Corretamente

## Problema Identificado

O sistema atual faz uma validação ERRADA que bloqueia configurações válidas. A Z-API tem DOIS tipos de tokens diferentes:

| Token | Onde Encontrar | Para que serve |
|-------|----------------|----------------|
| **Instance Token** | Faz parte da URL: `.../token/{INSTANCE_TOKEN}/...` | Identificar a instância |
| **Client-Token (Security)** | Painel Z-API → Security → Ativar Token | Autenticação (header HTTP) |

### Cenário do Usuário
Você tem:
- **URL da API** (com instance ID e instance token embutidos)
- **ID da Instância** 
- **Token**: `F5DA3871D271E4965BD44484`

O código atual BLOQUEIA se o token for igual ao da URL, mas isso pode ser válido se:
1. O Security Token não foi ativado (Z-API pode aceitar o Instance Token como fallback)
2. Ou o Security Token foi configurado igual ao Instance Token (cenário raro)

## Solução: Simplificar para 3 Campos Claros

### Novo Modelo de Dados

```text
+------------------+----------------------------------------+
| Campo            | Exemplo                                |
+------------------+----------------------------------------+
| Instance ID      | 3E8A768C5D9F4A7B...                   |
| Instance Token   | F5DA3871D271E4965BD44484              |
| Client Token     | (opcional - só se ativou Security)    |
+------------------+----------------------------------------+
```

A URL da API será **montada automaticamente** pelo sistema:
```
https://api.z-api.io/instances/{INSTANCE_ID}/token/{INSTANCE_TOKEN}
```

### Alterações Técnicas

#### 1. Arquivo: `SuperAdminAgentConfigDrawer.tsx`

**Mudanças na interface e state:**
```typescript
interface InstanceConfig {
  id?: string;
  zapi_instance_id: string;     // ID da instância
  zapi_instance_token: string;  // Token da instância (vai na URL)
  zapi_client_token: string;    // Client-Token (header) - OPCIONAL
}
```

**Remover:**
- Campo `zapi_url` (será construído automaticamente)
- Validação `isTokenInvalid` (desnecessária com novo modelo)
- Função `getTokenFromUrl` (não mais necessária)

**Adicionar:**
- Função para montar URL base:
```typescript
const buildApiUrl = (instanceId: string, instanceToken: string): string => {
  return `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}`;
};
```

- Lógica para usar Client-Token OU Instance Token como header:
```typescript
const getAuthToken = (): string => {
  // Se tem Client-Token configurado, usa ele
  // Caso contrário, usa o Instance Token como fallback
  return config.zapi_client_token || config.zapi_instance_token;
};
```

**Novos campos na UI:**
```tsx
<div className="space-y-2">
  <Label>Instance ID</Label>
  <Input
    value={config.zapi_instance_id}
    onChange={(e) => setConfig(prev => ({ ...prev, zapi_instance_id: e.target.value }))}
    placeholder="Ex: 3E8A768C5D9F4A7B8C2E1D3F"
  />
  <p className="text-xs text-muted-foreground">
    Encontre no painel Z-API → Sua instância
  </p>
</div>

<div className="space-y-2">
  <Label>Instance Token</Label>
  <Input
    value={config.zapi_instance_token}
    onChange={(e) => setConfig(prev => ({ ...prev, zapi_instance_token: e.target.value }))}
    placeholder="Token da instância (obrigatório)"
  />
  <p className="text-xs text-muted-foreground">
    Token que aparece na URL da API
  </p>
</div>

<div className="space-y-2">
  <Label>Client-Token (Opcional)</Label>
  <Input
    type="password"
    value={config.zapi_client_token}
    onChange={(e) => setConfig(prev => ({ ...prev, zapi_client_token: e.target.value }))}
    placeholder="Só preencha se ativou Security Token"
  />
  <p className="text-xs text-muted-foreground">
    Somente se você ativou o Security Token em: Painel Z-API → Security
  </p>
</div>
```

#### 2. Arquivo: `whatsapp-zapi-action/index.ts`

**Mudanças para aceitar novo formato:**
```typescript
const { action, zapi_instance_id, zapi_instance_token, zapi_client_token } = await req.json();

// Validar parametros obrigatórios
if (!action || !zapi_instance_id || !zapi_instance_token) {
  throw new Error('Missing required fields');
}

// Montar URL base
const baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;

// Usar Client-Token se fornecido, senão usa Instance Token
const authToken = zapi_client_token || zapi_instance_token;

// Fazer request
const zapiResponse = await fetch(endpoint, {
  method: method,
  headers: {
    'Client-Token': authToken,
    'Content-Type': 'application/json',
  },
});
```

**Manter retrocompatibilidade:**
```typescript
// Aceitar formato antigo (zapi_url + zapi_token) OU novo formato
let baseUrl: string;
let authToken: string;

if (zapi_instance_id && zapi_instance_token) {
  // NOVO FORMATO
  baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;
  authToken = zapi_client_token || zapi_instance_token;
} else if (zapi_url && zapi_token) {
  // FORMATO ANTIGO (retrocompatibilidade)
  baseUrl = zapi_url.replace(/\/send-text\/?$/, '').replace(/\/$/, '');
  authToken = zapi_token;
} else {
  throw new Error('Missing Z-API credentials');
}
```

#### 3. Atualizar `AgentConfigDrawer.tsx` (Tenants)

Aplicar as mesmas alterações do Super Admin para manter paridade.

#### 4. Banco de Dados

A tabela `whatsapp_instances` já tem os campos necessários:
- `instance_name` → Usar para Instance ID
- `zapi_url` → DEPRECAR (será calculado)
- `zapi_token` → Usar para Instance Token

**Opção:** Adicionar campo `zapi_client_token` para o Security Token opcional.

## Fluxo Final

```text
Usuário preenche:
┌──────────────────────────────────────────┐
│ Instance ID:    [3E8A768C5D9F...]        │
│ Instance Token: [F5DA3871D271...]        │
│ Client-Token:   [opcional]               │
└──────────────────────────────────────────┘
           │
           ▼
Sistema monta automaticamente:
┌──────────────────────────────────────────┐
│ URL: https://api.z-api.io/instances/     │
│      {ID}/token/{TOKEN}/qr-code          │
│                                          │
│ Header: Client-Token: {CLIENT || TOKEN}  │
└──────────────────────────────────────────┘
           │
           ▼
QR Code gerado com sucesso!
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Reestruturar campos e remover validação incorreta |
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | Mesmas alterações para tenants |
| `supabase/functions/whatsapp-zapi-action/index.ts` | Aceitar novo formato + retrocompatibilidade |

## Benefícios

1. **Sem validação bloqueante incorreta** - Aceita qualquer token válido
2. **Campos claros** - Cada campo tem propósito específico
3. **Flexibilidade** - Funciona com ou sem Security Token ativado
4. **URL automática** - Menos chance de erro de digitação
