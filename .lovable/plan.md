

## Corrigir: Mensagens recebidas nao aparecem na Caixa de Entrada dos agentes

### Problema

Quando a Laura (ou qualquer agente) recebe uma mensagem no WhatsApp, ela nao aparece na Caixa de Entrada do CRM. Isso acontece porque o sistema **nao configura o webhook da Z-API** automaticamente quando uma instancia conecta.

Ou seja: a Z-API nao sabe para onde enviar as mensagens recebidas. O `notifySentByMe` e ativado (mensagens enviadas pelo celular sao capturadas), mas o `receivedCallback` (webhook para mensagens recebidas) nunca e configurado.

### Solucao

Adicionar a configuracao automatica do webhook da Z-API quando uma instancia conecta com sucesso.

### Mudancas

**1. Edge Function `whatsapp-zapi-action/index.ts`**

Adicionar uma nova action `set-webhook` que chama o endpoint da Z-API `POST /update-webhook` com o payload:

```text
{
  "webhookUrl": "https://<SUPABASE_URL>/functions/v1/whatsapp-webhook",
  "sendAckCallback": false
}
```

Isso configura o `receivedCallback` na Z-API para que mensagens recebidas sejam enviadas ao nosso webhook.

**2. Componente Tenant `WhatsAppAgentsSettings.tsx`**

Apos a conexao bem-sucedida (onde ja ativa o `notifySentByMe`), adicionar uma chamada para a nova action `set-webhook`:

```text
await supabase.functions.invoke("whatsapp-zapi-action", {
  body: {
    action: "set-webhook",
    zapi_instance_id: config.zapi_instance_id,
    zapi_instance_token: config.zapi_instance_token,
    zapi_client_token: config.zapi_client_token || undefined,
  },
});
```

**3. Componente Super Admin `SuperAdminAgentsSettings.tsx`**

Mesma alteracao do item 2, para garantir paridade entre Super Admin e Tenant.

### Arquivos a editar

1. `supabase/functions/whatsapp-zapi-action/index.ts` - adicionar action `set-webhook`
2. `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` - chamar `set-webhook` apos conexao
3. `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` - chamar `set-webhook` apos conexao

### Nota

Apos implementar, a Laura precisara **reconectar** a instancia dela (desconectar e conectar novamente via QR Code) para que o webhook seja configurado automaticamente. Alternativamente, voce pode acessar o painel Z-API dela e configurar o webhook manualmente com a URL: `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-webhook`

