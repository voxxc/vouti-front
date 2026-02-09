

## Ativar captura de mensagens enviadas pelo celular automaticamente

### Contexto

A Z-API possui um endpoint especifico para ativar o recebimento de webhooks de mensagens enviadas pelo celular: `PUT /update-notify-sent-by-me` com body `{ "notifySentByMe": true }`. Sem essa configuracao, a Z-API nao envia o callback `SentByMeCallback` e as mensagens do celular nunca chegam ao webhook.

Atualmente, quando uma instancia conecta (apos escanear o QR Code), o sistema apenas atualiza o status no banco. Nao ativa o `notifySentByMe`.

### Solucao

Configurar automaticamente o `notifySentByMe: true` no momento em que a instancia conecta com sucesso, garantindo que todo tenant (e o Super Admin) tenha essa funcionalidade sem precisar de configuracao manual.

### Alteracoes

**1. Edge Function `supabase/functions/whatsapp-zapi-action/index.ts`**

Adicionar duas novas actions no switch:

- `update-notify-sent-by-me`: Chama `PUT {baseUrl}/update-notify-sent-by-me` com body `{ "notifySentByMe": true }`
- `update-webhook-received`: (Opcional, para garantir que o webhook de recebimento tambem esta configurado) Chama `PUT {baseUrl}/update-webhook-received` com body `{ "value": "{webhookUrl}" }`

```text
switch (action):
  case 'update-notify-sent-by-me':
    endpoint = `${baseUrl}/update-notify-sent-by-me`
    method = 'PUT'
    body = { "notifySentByMe": true }
    break;
```

**2. `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx`**

No polling de status (funcao `startPolling`), quando detecta `data?.data?.connected`, adicionar uma chamada automatica para ativar o `notifySentByMe`:

```text
if (data?.data?.connected) {
  // ... codigo existente de update status ...

  // NOVO: Ativar captura de mensagens enviadas pelo celular
  await supabase.functions.invoke("whatsapp-zapi-action", {
    body: {
      action: "update-notify-sent-by-me",
      zapi_instance_id: config.zapi_instance_id,
      zapi_instance_token: config.zapi_instance_token,
      zapi_client_token: config.zapi_client_token || undefined,
    },
  });
}
```

**3. `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`**

Aplicar a mesma alteracao no componente de Tenants para manter paridade. A chamada ao `update-notify-sent-by-me` acontece automaticamente ao conectar.

### Resumo do fluxo

```text
Agente escaneia QR Code
  -> Polling detecta "connected"
  -> Atualiza status no banco (ja existente)
  -> NOVO: Chama PUT /update-notify-sent-by-me { notifySentByMe: true }
  -> Z-API passa a enviar SentByMeCallback para o webhook
  -> Webhook processa e salva mensagens do celular
  -> Mensagens aparecem na Caixa de Entrada
```

### Arquivos modificados

1. `supabase/functions/whatsapp-zapi-action/index.ts` - Nova action `update-notify-sent-by-me`
2. `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` - Chamada automatica ao conectar
3. `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` - Mesma chamada para tenants
