

## Problemas Identificados

### Problema 1: Status mostra "Desconectado" mesmo conectado

| Aspecto | O que acontece | Por que está errado |
|---------|----------------|---------------------|
| Banco de dados | `connection_status: 'disconnected'` | Deveria ser `'connected'` |
| `checkConnectionStatus()` | Apenas atualiza o estado local (React) | Não atualiza o banco de dados |
| Ao carregar a página | Lê do banco → mostra desconectado | Ignora o status real da Z-API |

O fluxo atual:
1. Página carrega → busca `connection_status` do banco → mostra "Desconectado"
2. `checkConnectionStatus()` chama Z-API → retorna `connected: true`
3. Atualiza apenas `useState` local, **NÃO atualiza o banco**
4. Usuário recarrega página → volta a mostrar "Desconectado"

### Problema 2: Botão "Desconectar" não aparece

Como o status está "desconectado" na UI, o código exibe o botão "Conectar" ao invés de "Desconectar":
```tsx
{connectionStatus === 'connected' ? (
  <Button onClick={handleDisconnect}>Desconectar</Button>  // ← NÃO aparece
) : (
  <Button onClick={handleConnect}>Conectar</Button>        // ← Aparece sempre
)}
```

### Problema 3: Botão Resetar não funciona

| Código atual | Problema |
|--------------|----------|
| `.delete().eq('user_id', userData.user.id)` | O `user_id` no banco é `d4bcecc4-661a-430c-9b84-abdc3576a896` |
| `userData.user.id` | Retorna `c3bdf9c8-22b7-4597-8f68-bba7c742864d` (usuário logado) |
| Resultado | IDs diferentes → delete não encontra registro → campos não limpam |

Além disso, o estado local (`zapiConfig`) não é limpo após o delete.

---

## Correções Necessárias

### 1. Atualizar banco quando verificar status real da Z-API

No `checkConnectionStatus()`:
```typescript
const checkConnectionStatus = async () => {
  try {
    const { data } = await supabase.functions.invoke('whatsapp-connect', {
      body: { action: 'get_status' }
    });

    if (data?.success && data?.data?.connected) {
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // NOVO: Atualizar banco de dados também
      if (tenantId) {
        await supabase
          .from('whatsapp_instances')
          .update({ connection_status: 'connected' })
          .eq('tenant_id', tenantId);
      }
    } else {
      // Também atualizar quando desconectado
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      if (tenantId) {
        await supabase
          .from('whatsapp_instances')
          .update({ connection_status: 'disconnected' })
          .eq('tenant_id', tenantId);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar status:', error);
  }
};
```

### 2. Adicionar `tenantId` como dependência do useEffect

```typescript
useEffect(() => {
  if (tenantId) {
    checkConnectionStatus();
  }
}, [tenantId]);  // Rodar quando tenantId estiver disponível
```

### 3. Corrigir botão Resetar

```typescript
const handleReset = async () => {
  setIsResetting(true);
  
  try {
    // Usar tenant_id ao invés de user_id
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Limpar estado local
    setZapiConfig({ url: '', instanceId: '', token: '' });
    setIsConnected(false);
    setQrCode(null);
    setConnectionStatus('disconnected');
    
    toast({
      title: "Configurações resetadas",
      description: "Todos os campos foram limpos. Configure novamente.",
    });
  } catch (error) {
    console.error('Erro ao resetar:', error);
    toast({
      title: "Erro",
      description: "Falha ao resetar configurações",
      variant: "destructive",
    });
  } finally {
    setIsResetting(false);
  }
};
```

---

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/WhatsApp/sections/WhatsAppSettings.tsx` | 3 funções: `checkConnectionStatus`, `useEffect`, `handleReset` |

---

## Resultado Esperado

Após as correções:

1. **Status correto**: Ao abrir a página, verifica o status real na Z-API e atualiza banco + UI
2. **Botão Desconectar**: Aparece quando a Z-API está conectada
3. **Botão Resetar funciona**: Deleta pelo `tenant_id` correto e limpa os campos da UI

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO ABRE CONFIGURAÇÕES                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Carrega config do banco (url, instanceId, token)               │
│  2. Chama Z-API /status para verificar conexão REAL                │
│  3. Se conectado:                                                   │
│     - Atualiza banco: connection_status = 'connected'              │
│     - Atualiza UI: mostra "Conectado" + botão "Desconectar"        │
│  4. Se desconectado:                                                │
│     - Atualiza banco: connection_status = 'disconnected'           │
│     - Atualiza UI: mostra "Desconectado" + botão "Conectar"        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO CLICA "RESETAR"                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Delete do banco usando tenant_id (não user_id)                 │
│  2. Limpa estado local: url='', instanceId='', token=''            │
│  3. Reseta status: disconnected                                     │
│  4. Toast: "Todos os campos foram limpos"                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

