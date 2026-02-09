

# Plano: Implementar Polling Automático de Status no Design de Agentes

## Problema

O QR Code é gerado corretamente, mas falta o **polling automático** que existia no plano anterior:

| Sistema Original | Sistema Atual (Agentes) |
|------------------|-------------------------|
| Polling a cada 5s verificando `/status` | Sem polling automático |
| Status muda automaticamente ao conectar | Usuario precisa clicar Refresh manualmente |
| QR Code desaparece ao conectar | QR Code permanece até fechar manualmente |

## Fluxo a Implementar

```text
USUARIO CLICA "CONECTAR VIA QR CODE"
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│ 1. Frontend chama: { action: 'qr-code' }                        │
│ 2. Edge function retorna: { success: true, data: { value: ... }}│
│ 3. Frontend renderiza: <img src="data:image/png;base64,..." /> │
│ 4. Frontend INICIA POLLING a cada 5 segundos                    │
│    └─ Chama: { action: 'status' }                               │
│ 5. Quando status.connected === true                             │
│    └─ Limpa QR Code                                             │
│    └─ Para o polling                                            │
│    └─ Atualiza estado para "Conectado"                          │
│    └─ Atualiza banco de dados                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Adicionar polling apos exibir QR Code |
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | Mesma logica de polling |

## Implementacao

### 1. Adicionar Estado e Ref para Controle do Polling

```typescript
const [isPolling, setIsPolling] = useState(false);
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

### 2. Funcao de Polling com Status

```typescript
const startPolling = () => {
  if (pollingIntervalRef.current) return;
  
  setIsPolling(true);
  
  pollingIntervalRef.current = setInterval(async () => {
    try {
      const response = await supabase.functions.invoke('whatsapp-zapi-action', {
        body: {
          action: 'status',
          zapi_instance_id: config.zapi_instance_id,
          zapi_instance_token: config.zapi_instance_token,
          zapi_client_token: config.zapi_client_token,
        }
      });

      if (response.data?.success && response.data?.data?.connected === true) {
        // Conectado! Parar polling
        stopPolling();
        setIsConnected(true);
        setQrCode(null);
        
        // Atualizar banco
        if (config.id) {
          await supabase
            .from("whatsapp_instances")
            .update({ connection_status: "connected" })
            .eq("id", config.id);
        }
        
        toast.success("WhatsApp conectado com sucesso!");
        onAgentUpdated();
      }
    } catch (error) {
      console.error("Erro no polling:", error);
    }
  }, 5000); // A cada 5 segundos
};

const stopPolling = () => {
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  setIsPolling(false);
};
```

### 3. Iniciar Polling ao Exibir QR Code

```typescript
const handleConnect = async () => {
  // ... codigo existente ...
  
  if (result.success && result.data?.value) {
    setQrCode(result.data.value);
    toast.success("Escaneie o QR Code com seu WhatsApp");
    startPolling(); // <-- INICIAR POLLING AQUI
  }
};
```

### 4. Limpar Polling ao Fechar Drawer

```typescript
useEffect(() => {
  return () => {
    stopPolling();
  };
}, []);

// E quando fechar o drawer
const handleClose = () => {
  stopPolling();
  onOpenChange(false);
};
```

### 5. Adicionar Indicador Visual de Polling

```typescript
{qrCode && (
  <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
    <span className="text-sm font-medium">Escaneie o QR Code</span>
    <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" className="w-48 h-48" />
    
    {isPolling && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Aguardando conexao...</span>
      </div>
    )}
    
    <Button variant="ghost" size="sm" onClick={() => { stopPolling(); setQrCode(null); }}>
      Cancelar
    </Button>
  </div>
)}
```

## Resultado Esperado

1. Usuario salva credenciais Z-API
2. Clica em "Conectar via QR Code"
3. QR Code aparece na tela (imagem renderizada)
4. Mensagem "Aguardando conexao..." com spinner
5. Usuario escaneia com WhatsApp
6. Status muda para "Conectado" automaticamente (sem clicar)
7. QR Code desaparece da tela
8. Toast de sucesso aparece

## Resumo

A Edge Function ja esta correta. O problema eh que o frontend nao implementa o **polling automatico** que verifica o status apos exibir o QR Code. A solucao eh adicionar um `setInterval` de 5 segundos que chama `action: 'status'` ate que `connected === true`.

