

# Plano: Corrigir Leitura de Status e Funcionamento do QR Code

## Problema Identificado

| Componente | Estado Atual | Problema |
|------------|--------------|----------|
| `whatsapp_instances` | VAZIO | Nenhuma instância salva para o agente "Admin" |
| Agente "Admin" | Existe (`abd8ace2...`) | Sem instância vinculada |
| Edge Function | Tem fallback para env vars | Funciona quando não recebe credenciais |
| Frontend (Drawer) | Requer credenciais no form | Não usa fallback das env vars |

## Diagnóstico Visual

```text
SITUACAO ATUAL
┌─────────────────────────────────────────────────────────────────┐
│ Drawer abre → Busca whatsapp_instances → VAZIO                  │
│            → config.zapi_instance_id = ""                       │
│            → config.zapi_instance_token = ""                    │
│            → Botão "Conectar" DESABILITADO (disabled)           │
│            → checkConnectionStatus() NÃO executa (linha 98)     │
│                                                                 │
│ RESULTADO: Mostra "Desconectado" mesmo estando conectado        │
└─────────────────────────────────────────────────────────────────┘

COMO DEVERIA SER
┌─────────────────────────────────────────────────────────────────┐
│ Drawer abre → Busca whatsapp_instances → VAZIO                  │
│            → Usa FALLBACK das variáveis de ambiente             │
│            → Chama checkConnectionStatus() mesmo sem credenciais│
│            → Edge function usa Z_API_URL e Z_API_TOKEN          │
│            → Retorna connected: true                            │
│                                                                 │
│ RESULTADO: Mostra "Conectado" corretamente                      │
└─────────────────────────────────────────────────────────────────┘
```

## Solução

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `SuperAdminAgentConfigDrawer.tsx` | Usar fallback para env vars quando drawer vazio |
| `AgentConfigDrawer.tsx` | Mesma lógica |

### Alterações no Código

#### 1. Verificar Status ao Abrir (mesmo sem credenciais)

```typescript
// checkConnectionStatus - Remover validação que bloqueia
const checkConnectionStatus = async () => {
  // REMOVER ESTA LINHA:
  // if (!config.zapi_instance_id || !config.zapi_instance_token) return;
  
  setIsCheckingStatus(true);
  try {
    const response = await supabase.functions.invoke('whatsapp-zapi-action', {
      body: {
        action: 'status',
        // Se tiver credenciais do agente, usa. Senão, envia vazio
        // e a Edge Function usa o fallback das env vars
        zapi_instance_id: config.zapi_instance_id || undefined,
        zapi_instance_token: config.zapi_instance_token || undefined,
        zapi_client_token: config.zapi_client_token || undefined,
      }
    });
    // ... resto do código
  }
};
```

#### 2. Chamar checkConnectionStatus ao Abrir o Drawer

```typescript
const loadInstanceConfig = async () => {
  // ... código existente que carrega do banco ...
  
  // NOVO: Verificar status real após carregar (mesmo se não tiver config)
  setTimeout(() => {
    checkConnectionStatus();
  }, 300);
};
```

#### 3. Permitir Botão "Conectar via QR Code" Sem Credenciais

```typescript
// Remover disabled quando não tem credenciais específicas
// A Edge Function vai usar o fallback

<Button 
  variant="outline" 
  className="flex-1 gap-2" 
  onClick={handleConnect}
  // REMOVER: disabled={!config.zapi_instance_id || !config.zapi_instance_token}
>
  <QrCode className="h-4 w-4" />
  Conectar via QR Code
</Button>
```

#### 4. handleConnect - Remover Validação Bloqueante

```typescript
const handleConnect = async () => {
  // REMOVER:
  // if (!config.zapi_instance_id || !config.zapi_instance_token) {
  //   toast.error("Preencha Instance ID e Instance Token primeiro");
  //   return;
  // }

  try {
    const response = await supabase.functions.invoke('whatsapp-zapi-action', {
      body: {
        action: 'qr-code',
        zapi_instance_id: config.zapi_instance_id || undefined,
        zapi_instance_token: config.zapi_instance_token || undefined,
        zapi_client_token: config.zapi_client_token || undefined,
      }
    });
    // ... resto do código
  }
};
```

#### 5. handleDisconnect - Mesmo Padrão

```typescript
const handleDisconnect = async () => {
  // REMOVER validação bloqueante
  // Permitir que Edge Function use fallback
};
```

#### 6. handleReset - Desconectar Antes de Limpar

```typescript
const handleReset = async () => {
  // 1. Desconectar da Z-API (usando fallback se necessário)
  await supabase.functions.invoke('whatsapp-zapi-action', {
    body: {
      action: 'disconnect',
      zapi_instance_id: config.zapi_instance_id || undefined,
      zapi_instance_token: config.zapi_instance_token || undefined,
    }
  }).catch(() => {}); // Ignorar erros
  
  // 2. Limpar do banco
  if (config.id) {
    await supabase.from("whatsapp_instances").delete().eq("id", config.id);
  }
  
  // 3. Limpar estado local
  setConfig({ zapi_instance_id: "", zapi_instance_token: "", zapi_client_token: "" });
  setIsConnected(false);
  
  toast.success("Configurações resetadas e WhatsApp desconectado");
};
```

## Fluxo Esperado Após Correção

### Cenário 1: Abrir Drawer (já conectado via site Z-API)
1. Drawer abre
2. Carrega config do banco (vazio)
3. Chama `checkConnectionStatus()` automaticamente
4. Edge Function usa fallback `Z_API_URL` + `Z_API_TOKEN`
5. Retorna `connected: true`
6. UI mostra **"Conectado"**

### Cenário 2: Resetar Configurações
1. Clica "Resetar Configurações"
2. Chama `disconnect` na Z-API (com fallback)
3. Limpa registro do banco
4. UI mostra **"Desconectado"**

### Cenário 3: Gerar QR Code
1. Clica "Conectar via QR Code"
2. Edge Function usa fallback
3. Retorna QR Code
4. Polling verifica status até conectar

## Resumo

O problema central é que o frontend **exige** credenciais nos campos do formulário, mas as credenciais estão nas **variáveis de ambiente**. A solução é:

1. Remover validações que bloqueiam quando campos estão vazios
2. Deixar a Edge Function usar o fallback automaticamente
3. Chamar `checkConnectionStatus()` ao abrir o drawer
4. Permitir todas as ações mesmo sem credenciais no formulário

