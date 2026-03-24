

# Adicionar mensagem pré-definida ao redirecionamento WhatsApp

Alteração simples: adicionar o parâmetro `text` na URL do WhatsApp.

### `src/pages/WhatsAppRedirect.tsx`

Mudar a URL de:
```
https://wa.me/5592991276333
```
Para:
```
https://wa.me/5592991276333?text=Olá%2C%20Quero%20conhecer%20a%20Vouti.
```

Isso faz com que, ao abrir o WhatsApp, o campo de mensagem já venha preenchido com "Olá, Quero conhecer a Vouti."

