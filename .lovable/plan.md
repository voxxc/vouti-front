

# Plano: Corrigir Endpoint de QR Code e Melhorar Tratamento de Resposta

## Problema Identificado

| Aspecto | Atual | Correto |
|---------|-------|---------|
| Endpoint QR | `/qr-code/image` | `/qrcode` |
| Logs | Chamada feita, sem resposta | Precisa logar resposta |
| Loading | Fica infinito se der erro | Precisa timeout |

## Causa Raiz

A Edge Function usa `/qr-code/image` mas a documentacao Z-API indica que o endpoint correto pode ser `/qrcode` (sem hifen). Alem disso, se a resposta demorar ou falhar, o loading fica infinito no frontend.

## Solucao

### 1. Corrigir o Endpoint na Edge Function

```typescript
// supabase/functions/whatsapp-zapi-action/index.ts

case 'qr-code':
  // ANTES: endpoint = `${baseUrl}/qr-code/image`;
  // DEPOIS: Usar o formato correto da Z-API
  endpoint = `${baseUrl}/qrcode`;
  break;
```

### 2. Melhorar Tratamento de Resposta

```typescript
// Garantir que a resposta seja processada corretamente
const zapiResponse = await fetch(endpoint, {
  method: method,
  headers: headers,
});

// Verificar se a resposta eh imagem (qr-code pode retornar PNG direto)
const contentType = zapiResponse.headers.get('content-type');

let zapiData;
if (contentType?.includes('image/')) {
  // Se for imagem, converter para base64
  const buffer = await zapiResponse.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  zapiData = { value: `data:image/png;base64,${base64}` };
} else {
  // Se for JSON, parse normal
  zapiData = await zapiResponse.json();
}

console.log('Z-API Response:', zapiData);
```

### 3. Adicionar Timeout no Frontend

```typescript
// SuperAdminAgentsSettings.tsx - handleGenerateQRCode

setIsGeneratingQR(true);
try {
  // Adicionar timeout de 30 segundos
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout ao gerar QR Code')), 30000)
  );

  const { data, error } = await Promise.race([
    supabase.functions.invoke("whatsapp-zapi-action", {
      body: {
        action: "qr-code",
        zapi_instance_id: config.zapi_instance_id,
        zapi_instance_token: config.zapi_instance_token,
        zapi_client_token: config.zapi_client_token || undefined,
      },
    }),
    timeoutPromise
  ]) as any;

  // Processar resposta...
}
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/whatsapp-zapi-action/index.ts` | Corrigir endpoint e tratamento de resposta |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` | Adicionar timeout e melhor feedback |

## Fluxo Esperado Apos Correcao

```text
1. Usuario clica "Conectar via QR Code"
2. Loading aparece
3. Edge Function chama /qrcode
4. Z-API retorna QR Code (JSON ou imagem)
5. Edge Function processa e retorna base64
6. Frontend recebe e exibe o QR Code
7. Polling inicia para verificar conexao
8. Usuario escaneia QR Code
9. Polling detecta connected=true
10. UI atualiza para "Conectado"
```

## Validacao

Apos implementar, o log deve mostrar:

```text
Z-API Action: qr-code -> https://api.z-api.io/instances/.../token/.../qrcode
Client-Token: [PROVIDED]
Z-API Response: { value: "data:image/png;base64,..." }
```

