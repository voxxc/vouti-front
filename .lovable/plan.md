
# Plano: Corrigir Funcao Desconectar do Z-API

## Problema Identificado

O botao "Desconectar" no drawer do agente nao funciona porque:

1. **CORS**: O navegador faz chamada direta para `${config.zapi_url}/disconnect`, que falha por restricoes de CORS
2. **Silencioso**: O erro e capturado no try/catch mas o toast de erro nao aparece (ou o usuario nao percebe)
3. **Edge Function existente**: A `whatsapp-connect` usa credenciais globais, nao as do agente especifico

## Solucao

Criar uma nova Edge Function `whatsapp-zapi-action` que:
- Aceita credenciais dinamicas (url, token) como parametros
- Executa acoes (status, disconnect, qr-code) na Z-API via backend (sem CORS)
- Retorna o resultado para o frontend

## Nova Edge Function

### `supabase/functions/whatsapp-zapi-action/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, zapi_url, zapi_token } = await req.json();

    // Validar parametros
    if (!action || !zapi_url || !zapi_token) {
      throw new Error('Missing required fields: action, zapi_url, or zapi_token');
    }

    let endpoint = '';
    let method = 'GET';

    switch (action) {
      case 'status':
        endpoint = `${zapi_url}/status`;
        break;
      case 'disconnect':
        endpoint = `${zapi_url}/disconnect`;
        method = 'POST';
        break;
      case 'qr-code':
        endpoint = `${zapi_url}/qr-code/image`;
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log(`Z-API Action: ${action} -> ${endpoint}`);

    const zapiResponse = await fetch(endpoint, {
      method: method,
      headers: {
        'Client-Token': zapi_token,
        'Content-Type': 'application/json',
      },
    });

    const zapiData = await zapiResponse.json();
    console.log('Z-API Response:', zapiData);

    return new Response(JSON.stringify({
      success: zapiResponse.ok,
      data: zapiData,
      action: action
    }), {
      status: zapiResponse.ok ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-zapi-action:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## Alteracoes no Frontend

### `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`

Modificar `handleDisconnect` para usar a Edge Function:

```typescript
const handleDisconnect = async () => {
  if (!config.zapi_url || !config.zapi_token) return;

  try {
    const response = await supabase.functions.invoke('whatsapp-zapi-action', {
      body: {
        action: 'disconnect',
        zapi_url: config.zapi_url,
        zapi_token: config.zapi_token,
      }
    });

    if (response.error) throw response.error;
    
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao desconectar');
    }

    setIsConnected(false);
    setQrCode(null);
    
    // Atualizar status no DB
    if (config.id) {
      await supabase
        .from("whatsapp_instances")
        .update({ connection_status: "disconnected" })
        .eq("id", config.id);
    }

    toast.success("Desconectado com sucesso!");
    onAgentUpdated();
  } catch (error: any) {
    console.error("Erro ao desconectar:", error);
    toast.error(error.message || "Erro ao desconectar");
  }
};
```

Tambem atualizar `checkConnectionStatus` e `handleConnect` para usar a mesma Edge Function.

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/whatsapp-zapi-action/index.ts` | **CRIAR** |
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | Modificar handlers |

## Fluxo Corrigido

```text
Usuario clica "Desconectar"
        |
        v
Frontend chama Edge Function
supabase.functions.invoke('whatsapp-zapi-action', {
  action: 'disconnect',
  zapi_url: '...',
  zapi_token: '...'
})
        |
        v
Edge Function faz POST para Z-API
(sem problema de CORS)
        |
        v
Retorna resultado
        |
        v
Frontend atualiza estado + banco + mostra toast
```

## Resultado Esperado

| Acao | Antes | Depois |
|------|-------|--------|
| Desconectar | Falha silenciosa (CORS) | Funciona via Edge Function |
| Verificar Status | Pode falhar (CORS) | Funciona via Edge Function |
| Obter QR Code | Pode falhar (CORS) | Funciona via Edge Function |
