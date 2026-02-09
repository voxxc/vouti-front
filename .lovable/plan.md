

# Plano: Corrigir Carregamento de Credenciais Z-API no Tenant /demorais

## Situação Atual

### Banco de Dados (whatsapp_instances)

| Instance ID | tenant_id | zapi_url | zapi_token |
|-------------|-----------|----------|------------|
| 3E8A7687... | demorais ✅ | https://api.z-api.io/instances/3E8A7687... | F5DA3871... |
| 3E9FB06B... | NULL | NULL | NULL |

### Problema

1. **WhatsAppSettings.tsx** não carrega as credenciais existentes da tabela `whatsapp_instances`
2. Os campos URL, Instance ID e Token aparecem **vazios** mesmo tendo dados no banco
3. Quando o usuário tenta enviar pelo chat, o webhook já funciona porque usa credenciais da tabela

## Solução

### 1. Modificar WhatsAppSettings.tsx

Adicionar um `useEffect` para carregar as credenciais existentes do banco quando o componente montar:

```typescript
// Carregar credenciais existentes do tenant
useEffect(() => {
  const loadExistingConfig = async () => {
    if (!tenantId) return;
    
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, zapi_url, zapi_token, connection_status')
      .eq('tenant_id', tenantId)
      .single();
    
    if (instance) {
      // Extrair URL base da zapi_url (sem o instance id)
      const baseUrl = instance.zapi_url?.replace(`/instances/${instance.instance_name}`, '') || '';
      
      setZapiConfig({
        url: instance.zapi_url || '',
        instanceId: instance.instance_name || '',
        token: instance.zapi_token || ''
      });
      
      setConnectionStatus(
        instance.connection_status === 'connected' ? 'connected' : 'disconnected'
      );
      setIsConnected(instance.connection_status === 'connected');
    }
  };
  
  loadExistingConfig();
}, [tenantId]);
```

### 2. Corrigir saveZapiConfig

Atualizar para salvar as credenciais diretamente na tabela `whatsapp_instances`:

```typescript
const saveZapiConfig = async () => {
  // ... validação ...
  
  const zapiUrlComplete = zapiConfig.url.endsWith(`/${zapiConfig.instanceId}`)
    ? zapiConfig.url
    : `${zapiConfig.url}/instances/${zapiConfig.instanceId}`;
  
  await supabase
    .from('whatsapp_instances')
    .upsert({
      instance_name: zapiConfig.instanceId,
      tenant_id: tenantId,
      user_id: userData.user.id,
      zapi_url: zapiUrlComplete,
      zapi_token: zapiConfig.token,
      connection_status: 'disconnected',
      last_update: new Date().toISOString()
    }, {
      onConflict: 'instance_name'
    });
};
```

### 3. Limpar Instância Órfã (SQL)

Remover a instância sem credenciais vinculada a NULL:

```sql
DELETE FROM whatsapp_instances 
WHERE instance_name = '3E9FB06B7411D139EDBECA3E99AAFF93' 
  AND tenant_id IS NULL;
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/sections/WhatsAppSettings.tsx` | Adicionar useEffect para carregar config existente |
| **SQL (via insert tool)** | Deletar instância órfã |

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  TENANT /demorais ABRE CONFIGURAÇÕES                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. WhatsAppSettings monta                                                 │
│   2. useEffect busca: SELECT * FROM whatsapp_instances                      │
│                       WHERE tenant_id = 'd395b3a1-...'                      │
│   3. Encontra instância 3E8A7687...                                         │
│   4. Preenche campos:                                                       │
│      - URL: https://api.z-api.io/instances/3E8A7687...                      │
│      - Instance ID: 3E8A7687...                                             │
│      - Token: F5DA3871... (mascarado)                                       │
│   5. Status mostra: Desconectado (precisa escanear QR)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após implementação:
- Ao abrir `/demorais/whatsapp` > Configurações, os campos já estarão preenchidos
- Usuário pode ver/editar credenciais existentes
- Instância órfã do Super Admin será removida
- Fluxo de envio/recebimento continua funcionando normalmente

