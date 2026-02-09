

## Mensagem Enviada Aparecendo Instantaneamente na Conversa

### Problema

Quando voce envia uma mensagem pela Caixa de Entrada (digitando e clicando Enviar), a mensagem e salva no banco e enviada via Z-API, mas ela so aparece na conversa apos o polling de 2 segundos buscar novamente. Isso da a impressao de que a mensagem nao foi registrada.

### Causa

O componente `ChatPanel` limpa o campo de texto apos enviar, mas nao adiciona a mensagem localmente na lista de mensagens. O sistema depende exclusivamente do polling (2s) ou do real-time para exibir a mensagem enviada.

### Solucao

Adicionar um **update otimista** no estado local de mensagens imediatamente apos o envio. A mensagem aparece no chat instantaneamente, sem esperar o polling.

### Alteracoes

**1. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`**

Na funcao `handleSendMessage`, apos chamar a edge function com sucesso, inserir a mensagem diretamente no estado `messages`:

```text
handleSendMessage(text):
  1. Chamar whatsapp-send-message (ja existe)
  2. Se sucesso: adicionar ao state local:
     {
       id: uuid temporario,
       messageText: text,
       direction: "outgoing",
       timestamp: agora,
       isFromMe: true
     }
```

Isso faz a mensagem aparecer no chat imediatamente. Quando o polling rodar, ele traz a versao do banco (com id real), e a logica de deduplicacao evita duplicatas.

**2. `src/components/WhatsApp/sections/WhatsAppInbox.tsx`**

Aplicar a mesma alteracao no inbox dos Tenants para manter paridade.

### Detalhes tecnicos

- O id temporario usa `crypto.randomUUID()` para gerar um UUID unico
- O polling substituira a mensagem otimista pela versao real do banco na proxima iteracao (2s)
- Nenhuma alteracao no backend e necessaria - as mensagens ja sao salvas corretamente pela edge function `whatsapp-send-message`

