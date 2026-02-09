

# Plano: Restaurar 3 Campos Z-API no Drawer dos Tenants

## Situação Atual

| Componente | Campos |
|------------|--------|
| **SuperAdminAgentConfigDrawer** | 3 campos: Instance ID, URL, Token ✅ |
| **AgentConfigDrawer** (Tenants) | 2 campos: URL, Token ❌ |

## Objetivo

Sincronizar o drawer dos tenants com o do Super Admin, restaurando os **3 campos manuais**:
1. Instance ID
2. URL da Instância
3. Client Token

## Alterações no Arquivo

**Arquivo**: `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`

### 1. Adicionar useMemo ao import
```typescript
import { useState, useEffect, useMemo } from "react";
```

### 2. Atualizar interface InstanceConfig
```typescript
interface InstanceConfig {
  id?: string;
  zapi_instance_id: string;  // ADICIONAR
  zapi_url: string;
  zapi_token: string;
}
```

### 3. Remover função extractInstanceId (não mais necessária)
A extração automática será substituída pelo campo manual.

### 4. Adicionar validação de token (igual ao SuperAdmin)
```typescript
const getTokenFromUrl = (url: string): string | null => {
  const match = url.match(/\/token\/([A-F0-9]+)/i);
  return match ? match[1] : null;
};

const isTokenInvalid = useMemo(() => {
  if (!config.zapi_url || !config.zapi_token) return false;
  const urlToken = getTokenFromUrl(config.zapi_url);
  return urlToken?.toUpperCase() === config.zapi_token.toUpperCase();
}, [config.zapi_url, config.zapi_token]);
```

### 5. Atualizar estado inicial
```typescript
const [config, setConfig] = useState<InstanceConfig>({
  zapi_instance_id: "",
  zapi_url: "",
  zapi_token: "",
});
```

### 6. Atualizar loadInstanceConfig
```typescript
setConfig({
  id: data.id,
  zapi_instance_id: data.instance_name || "",
  zapi_url: data.zapi_url || "",
  zapi_token: data.zapi_token || "",
});
```

### 7. Atualizar handleSave
```typescript
// Usar o campo manual zapi_instance_id
instance_name: config.zapi_instance_id,
```

### 8. Adicionar campo Instance ID no formulário
```tsx
<div className="space-y-2">
  <Label htmlFor="zapi_instance_id">Instance ID</Label>
  <Input
    id="zapi_instance_id"
    value={config.zapi_instance_id}
    onChange={(e) => setConfig(prev => ({ ...prev, zapi_instance_id: e.target.value }))}
    placeholder="ID da instância Z-API"
  />
  <p className="text-xs text-muted-foreground">
    Identificador único da sua instância
  </p>
</div>
```

### 9. Atualizar alerta de token inválido
Usar a validação `isTokenInvalid` com melhor feedback visual (igual ao SuperAdmin).

### 10. Atualizar condição do botão Conectar
```tsx
disabled={!config.zapi_url || !config.zapi_instance_id || !config.zapi_token || isTokenInvalid}
```

## Resultado Esperado

Após as alterações, o drawer dos tenants terá:
- 3 campos manuais: Instance ID, URL, Client Token
- Validação visual se token estiver incorreto
- Paridade total com o componente do Super Admin

