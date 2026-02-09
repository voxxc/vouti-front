
# Plano: Sincronizar AgentConfigDrawer dos Tenants com Versão Atualizada

## Problema Identificado

O componente `AgentConfigDrawer.tsx` (usado pelos tenants/usuários normais) está **desatualizado** em comparação com o `SuperAdminAgentConfigDrawer.tsx` que foi corrigido anteriormente.

### Diferenças Críticas

| Aspecto | SuperAdmin (OK) | Tenant (Problema) |
|---------|-----------------|-------------------|
| Campos | 2 campos | 3 campos (Instance ID manual) |
| Validação | Detecta token duplicado | Sem validação |
| Instruções | Claras e detalhadas | Vagas |
| Extração ID | Automática da URL | Manual |

## Solução

Aplicar as mesmas melhorias do `SuperAdminAgentConfigDrawer.tsx` no `AgentConfigDrawer.tsx`:

1. **Remover campo `zapi_instance_id`** do estado e formulário
2. **Adicionar função `extractInstanceId()`** para extrair ID automaticamente da URL
3. **Adicionar função `isTokenFromUrl()`** para detectar erro comum
4. **Adicionar Alert destrutivo** quando token incorreto
5. **Atualizar labels e descrições** com instruções claras
6. **Desabilitar botão "Conectar"** quando configuração inválida

## Arquivo a Modificar

`src/components/WhatsApp/settings/AgentConfigDrawer.tsx`

## Alterações Detalhadas

### 1. Imports (adicionar)
```typescript
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
```

### 2. Interface InstanceConfig (simplificar)
```typescript
// ANTES
interface InstanceConfig {
  id?: string;
  zapi_url: string;
  zapi_instance_id: string;  // REMOVER
  zapi_token: string;
}

// DEPOIS
interface InstanceConfig {
  id?: string;
  zapi_url: string;
  zapi_token: string;
}
```

### 3. Funções auxiliares (adicionar)
```typescript
// Extrair instance_id da URL para salvar no banco
const extractInstanceId = (url: string): string => {
  const match = url.match(/instances\/([A-F0-9]+)/i);
  return match ? match[1] : 'instance';
};

// Detectar se o token inserido é o mesmo da URL
const isTokenFromUrl = (url: string, token: string): boolean => {
  if (!url || !token) return false;
  const match = url.match(/\/token\/([A-F0-9]+)/i);
  return match ? match[1].toUpperCase() === token.toUpperCase() : false;
};
```

### 4. Estado inicial (simplificar)
```typescript
// REMOVER zapi_instance_id do estado inicial
const [config, setConfig] = useState<InstanceConfig>({
  zapi_url: "",
  zapi_token: "",
});
```

### 5. loadInstanceConfig (ajustar)
Remover referência ao `zapi_instance_id` no setState

### 6. checkConnectionStatus (simplificar)
Remover parâmetro `instanceId` que não é mais necessário

### 7. handleSave (usar extração automática)
```typescript
const instanceName = extractInstanceId(config.zapi_url);
// Usar instanceName ao salvar no campo instance_name
```

### 8. handleConnect (simplificar validação)
```typescript
// ANTES
if (!config.zapi_url || !config.zapi_instance_id || !config.zapi_token) {

// DEPOIS  
if (!config.zapi_url || !config.zapi_token) {
```

### 9. UI do formulário

**Remover campo Instance ID completamente**

**Atualizar label do campo URL:**
```tsx
<Label htmlFor="zapi_url">URL da Instância</Label>
// ...
<p className="text-xs text-muted-foreground">
  Cole a URL completa da sua instância Z-API
</p>
```

**Atualizar label do campo Token:**
```tsx
<Label htmlFor="zapi_token">Client Token (Security Token)</Label>
// ...
<p className="text-xs text-muted-foreground">
  Encontre no painel Z-API: Configurações → Security → Client-Token.
  <strong> Este token é DIFERENTE do que aparece na URL!</strong>
</p>
```

**Adicionar Alert de erro:**
```tsx
{isTokenFromUrl(config.zapi_url, config.zapi_token) && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      O Client Token não pode ser igual ao token da URL. 
      Acesse o painel Z-API → Security → Client-Token para obter o token correto.
    </AlertDescription>
  </Alert>
)}
```

**Desabilitar botão Conectar:**
```tsx
<Button 
  variant="outline" 
  className="flex-1 gap-2" 
  onClick={handleConnect}
  disabled={!config.zapi_url || !config.zapi_token || isTokenFromUrl(config.zapi_url, config.zapi_token)}
>
```

## Resultado Esperado

Após as alterações:

1. Interface simplificada com apenas 2 campos necessários (URL + Client Token)
2. Instance ID extraído automaticamente da URL
3. Validação visual se usuário usar token errado
4. Instruções claras sobre onde encontrar o Client Token correto
5. Botão desabilitado quando configuração inválida
6. Paridade total com o componente do Super Admin
