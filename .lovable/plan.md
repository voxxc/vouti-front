

# Plano: Exibir QR Code da Z-API para Conexão

## Problemas Identificados

| Problema | Código Atual | Solução |
|----------|-------------|---------|
| Endpoint errado | `/qr-code` (retorna bytes) | `/qr-code/image` (retorna base64) |
| Mapeamento da resposta | `zapiData` direto | Mapear `zapiData.value` para `qrcode` |
| Verificação de status | `connectionData.status === 'open'` | `connectionData.data?.connected === true` |

### Documentação Z-API confirma:
```
GET .../qr-code        → Retorna bytes (precisa converter)
GET .../qr-code/image  → Retorna base64 (pronto para usar)
```

---

## Correções Necessárias

### 1. Edge Function: Usar endpoint correto

**Arquivo:** `supabase/functions/whatsapp-connect/index.ts`

```typescript
case 'get_qrcode':
  // ANTES: apiEndpoint = `${zapiUrl}/qr-code`;
  // DEPOIS:
  apiEndpoint = `${zapiUrl}/qr-code/image`;
  break;
```

### 2. Edge Function: Mapear resposta corretamente

```typescript
// Retornar dados formatados para o frontend
if (action === 'get_qrcode') {
  return new Response(JSON.stringify({
    success: true,
    qrcode: zapiData.value,  // base64 da imagem
    action: action
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

return new Response(JSON.stringify({
  success: true,
  data: zapiData,
  status: zapiData.connected ? 'connected' : 'disconnected',
  action: action
}), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### 3. Frontend: Corrigir verificação de conexão

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppSettings.tsx`

```typescript
// ANTES (linha 179):
if (connectionData?.success && connectionData.status === 'open') {

// DEPOIS:
if (connectionData?.success && connectionData.data?.connected === true) {
```

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO CLICA "CONECTAR"                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Frontend chama: { action: 'create_instance' } → /status        │
│  2. Se instância existe → Frontend chama: { action: 'get_qrcode' } │
│  3. Edge function chama: /qr-code/image                            │
│  4. Z-API retorna: { value: "base64..." }                          │
│  5. Edge function retorna: { success: true, qrcode: "base64..." }  │
│  6. Frontend renderiza: <img src="data:image/png;base64,..." />    │
│  7. Polling verifica status a cada 5s                              │
│  8. Quando conectado → limpa QR Code e mostra "Conectado"          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-connect/index.ts` | Usar `/qr-code/image` e mapear resposta |
| `src/components/WhatsApp/sections/WhatsAppSettings.tsx` | Corrigir verificação de status |

---

## Resultado Esperado

1. Usuário salva credenciais Z-API
2. Clica em "Conectar"
3. QR Code aparece na tela (imagem renderizada)
4. Usuário escaneia com WhatsApp
5. Status muda para "Conectado" automaticamente
6. QR Code desaparece da tela

