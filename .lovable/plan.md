

# Plano: Corrigir Desconexão do WhatsApp Z-API

## Problema Identificado

O botão "Desconectar" não funciona porque a edge function está chamando o endpoint **errado**.

| Aspecto | Código Atual | Correto (Z-API Docs) |
|---------|-------------|---------------------|
| Endpoint | `/logout` | `/disconnect` |
| URL completa | `{zapiUrl}/logout` | `{zapiUrl}/disconnect` |

### Logs comprovam que está conectado:
```json
{
  "connected": true,
  "error": "You are already connected.",
  "smartphoneConnected": true
}
```

### Documentação Z-API confirma:
```
GET https://api.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/disconnect
Header: Client-Token: ACCOUNT SECURITY TOKEN
```

---

## Correção Necessária

### Arquivo: `supabase/functions/whatsapp-connect/index.ts`

**Alterar linha 56:**
```typescript
// ANTES
case 'disconnect':
  apiEndpoint = `${zapiUrl}/logout`;
  break;

// DEPOIS  
case 'disconnect':
  apiEndpoint = `${zapiUrl}/disconnect`;
  break;
```

---

## Por que `/logout` não funciona?

O endpoint `/logout` simplesmente não existe na API Z-API. Os endpoints disponíveis são:

| Ação | Endpoint | Método |
|------|----------|--------|
| Ver status | `/status` | GET |
| QR Code | `/qr-code` | GET |
| **Desconectar** | **`/disconnect`** | **GET** |
| Reiniciar | `/restart` | GET |

---

## Resultado Esperado

Após a correção:

1. Usuário clica em "Desconectar"
2. Edge function chama `{zapiUrl}/disconnect`
3. Z-API desconecta o número
4. O status muda para "disconnected" 
5. O dashboard Z-API mostra como offline
6. Usuário pode gerar novo QR Code para conectar outro número

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO CLICA "DESCONECTAR"                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Frontend chama edge function: { action: 'disconnect' }         │
│  2. Edge function monta URL: {zapiUrl}/disconnect                  │
│  3. GET request para Z-API com Client-Token header                 │
│  4. Z-API retorna: { disconnected: true }                          │
│  5. Edge function atualiza banco: connection_status = 'disconnected'│
│  6. Frontend mostra: "WhatsApp desconectado"                       │
│  7. Botão muda para "Conectar" (QR Code disponível)                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Impacto

Esta é uma correção simples de **1 linha** que resolve um problema crítico de autonomia do usuário:

- Usuários poderão desconectar sem precisar do dono do SaaS
- Usuários poderão reconectar com outro número facilmente
- Múltiplos tenants poderão gerenciar suas próprias instâncias

