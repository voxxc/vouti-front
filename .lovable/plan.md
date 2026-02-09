
# Plano: Corrigir Exibicao do Status de Conexao no Drawer do Agente

## Problema

Ao abrir o drawer do Daniel (que esta conectado), a secao de Acoes mostra "Conectar" ao inves de "Desconectar". Isso acontece porque:

1. O drawer carrega o status do banco (`connected`) corretamente
2. Em seguida, chama `checkConnectionStatus()` que faz uma requisicao direta a API Z-API
3. Se a requisicao falhar (CORS, timeout, etc.), o estado e sobrescrito para `false`

## Solucao

Modificar a logica para:

1. **Priorizar o status do banco de dados** como fonte de verdade inicial
2. **Nao sobrescrever automaticamente** o status ao abrir o drawer
3. **Atualizar apenas quando o usuario clicar no botao de refresh** ou apos acoes explicitas

## Alteracoes no Arquivo

### `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`

#### 1. Remover chamada automatica ao checkConnectionStatus

```typescript
// ANTES (linha 70)
if (data) {
  setConfig({...});
  setIsConnected(data.connection_status === "connected");
  checkConnectionStatus(...); // <- REMOVE esta linha
}

// DEPOIS
if (data) {
  setConfig({...});
  setIsConnected(data.connection_status === "connected");
  // Nao verificar automaticamente - usar valor do banco
}
```

#### 2. Modificar checkConnectionStatus para atualizar o banco

Quando o usuario clicar no refresh, alem de verificar o status, tambem atualizar o banco:

```typescript
const checkConnectionStatus = async (url: string, instanceId: string, token: string) => {
  if (!url || !instanceId || !token) return;
  
  setIsCheckingStatus(true);
  try {
    const response = await fetch(`${url}/status`, {
      headers: { "Client-Token": token }
    });
    
    if (response.ok) {
      const data = await response.json();
      const connected = data?.connected === true;
      setIsConnected(connected);
      
      // Sincronizar com o banco de dados
      if (config.id) {
        await supabase
          .from("whatsapp_instances")
          .update({ connection_status: connected ? "connected" : "disconnected" })
          .eq("id", config.id);
        onAgentUpdated();
      }
    }
    // Se falhar, manter o status atual (nao sobrescrever)
  } catch (error) {
    console.error("Erro ao verificar status:", error);
    toast.error("Nao foi possivel verificar o status");
    // Manter o status atual - nao sobrescrever para false
  } finally {
    setIsCheckingStatus(false);
  }
};
```

#### 3. Melhorar UX da secao de Acoes

Quando conectado, mostrar visual claro:

```typescript
{/* Acoes de Conexao */}
<div className="space-y-3">
  <h3 className="font-medium text-sm">Acoes</h3>
  
  {isConnected ? (
    // CONECTADO - mostrar status e opcao de desconectar
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="text-green-600 font-medium">WhatsApp Conectado</span>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleDisconnect}>
          <XCircle className="h-4 w-4" />
          Desconectar
        </Button>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className={isCheckingStatus ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  ) : (
    // DESCONECTADO - mostrar QR Code
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 gap-2" onClick={handleConnect}>
        <QrCode className="h-4 w-4" />
        Conectar via QR Code
      </Button>
      <Button variant="outline" onClick={handleRefresh}>
        <RefreshCw className={isCheckingStatus ? 'animate-spin' : ''} />
      </Button>
    </div>
  )}

  {config.id && (
    <Button variant="destructive" className="w-full gap-2" onClick={handleReset}>
      <Trash2 className="h-4 w-4" />
      Resetar Configuracoes
    </Button>
  )}
</div>
```

## Fluxo Corrigido

```text
Drawer Abre
    |
    v
Carrega dados do DB
    |
    v
connection_status = "connected"
    |
    v
setIsConnected(true) <-- MANTIDO
    |
    v
UI mostra "Conectado" + botao "Desconectar"

    [Usuario clica Refresh]
            |
            v
    Chama API Z-API /status
            |
            +-- Sucesso: Atualiza estado + banco
            |
            +-- Falha: Mostra toast de erro, MANTEM estado atual
```

## Resultado Esperado

| Situacao | Antes | Depois |
|----------|-------|--------|
| Daniel conectado, abre drawer | Mostra "Conectar" (bug) | Mostra "Conectado" + "Desconectar" |
| Clica refresh, API ok | Atualiza estado | Atualiza estado + banco |
| Clica refresh, API falha | Muda para desconectado | Mantem estado + mostra erro |
| Clica reset | Limpa tudo | Limpa tudo (sem mudanca) |

## Arquivo Modificado

- `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`
