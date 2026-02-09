

# Plano: Corrigir Endpoint do QR Code para `/qr-code/image`

## Problema Identificado

| Aspecto | Valor Atual (ERRADO) | Valor Correto |
|---------|---------------------|---------------|
| Endpoint | `/qrcode` | `/qr-code/image` |
| Resposta esperada | JSON com value | Imagem base64 diretamente |

## Logs que Comprovam o Problema

```text
Z-API Action: qr-code -> .../qrcode
Z-API Response: {
  error: "NOT_FOUND",
  message: "Unable to find matching target resource method"
}
```

## Documentacao Oficial da Z-API

Segundo a documentacao em `developer.z-api.io`:

```text
/qr-code        -> Retorna BYTES do QR code
/qr-code/image  -> Retorna IMAGEM base64
```

O endpoint correto para obter a imagem base64 eh:
```
GET https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/qr-code/image
```

## Correcao na Edge Function

Arquivo: `supabase/functions/whatsapp-zapi-action/index.ts`

```typescript
// ANTES (linha 69):
case 'qr-code':
  endpoint = `${baseUrl}/qrcode`;
  break;

// DEPOIS:
case 'qr-code':
  endpoint = `${baseUrl}/qr-code/image`;
  break;
```

## Resultado Esperado

Apos a correcao:

```text
1. Usuario clica "Conectar via QR Code"
2. Edge Function chama: /qr-code/image
3. Z-API retorna: imagem PNG ou JSON com base64
4. Frontend renderiza: <img src="data:image/png;base64,..." />
5. Usuario escaneia e conecta
```

## Observacao

O codigo ja tem logica para tratar tanto resposta de imagem (binary) quanto JSON:
- Se `Content-Type` for `image/*` -> converte para base64
- Se for JSON -> usa o campo `value` diretamente

Isso garante compatibilidade com qualquer formato que a Z-API retornar.

