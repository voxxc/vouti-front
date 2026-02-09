
## O que eu verifiquei (e por que ainda não enviou)

Pelos logs anteriores do `whatsapp-webhook`, o erro real não era “IA não gerou resposta” (ela gerou), e sim o envio para a Z-API falhando com:

- `Client-Token ... not allowed`

Mesmo depois do ajuste de URL (`/token/{token}/send-text`), o código ainda envia o header:

- `Client-Token: {zapi_token}`

Na Z-API, o `Client-Token` (quando exigido) é um token de segurança da conta (diferente do token da instância). Enviar o token da instância no `Client-Token` pode continuar causando bloqueio, mesmo com a URL correta. Ou seja: **a mensagem é gerada e salva na interface, mas a chamada HTTP é negada pela Z-API**, então não chega no celular do lead.

Além disso, hoje o código não faz logging completo do retorno do Z-API (status/body) em todos os caminhos, o que dificulta diagnosticar rapidamente se o problema é token/endpoint/conta/limite.

## Objetivo
Garantir que **toda mensagem do Agente IA** (gerada no webhook) seja **enviada para o WhatsApp do lead** via Z-API com autenticação correta, e manter a mensagem registrada no histórico (UI).

---

## Mudanças propostas (implementação)

### 1) Ajustar o envio para Z-API (ponto crítico)
No `supabase/functions/whatsapp-webhook/index.ts`, nos dois pontos de envio (automação e IA):

- Manter a URL no formato correto:
  - `POST {zapi_url}/token/{zapi_token}/send-text`
- **Remover o header `Client-Token` quando ele não for um token de segurança válido**
  - Enviar apenas `Content-Type: application/json`

Para não quebrar quem usa “Client-Token” de verdade:
- Implementar suporte opcional a um secret novo (se necessário): `Z_API_CLIENT_TOKEN`
  - Se existir, aí sim enviar `Client-Token: Z_API_CLIENT_TOKEN`
  - Caso não exista, não enviar `Client-Token` nenhum

Resultado: o token de instância fica apenas na URL, e o Client-Token só é enviado se for o correto.

### 2) Logging de debug robusto (para confirmar em 1 teste)
Adicionar logs no webhook antes/depois do fetch:
- URL final (sem expor token completo; mascarar parte)
- status code da resposta
- body em texto quando não for JSON
- quando `response.ok === false`, logar o body inteiro

Isso vai deixar claro se o Z-API está respondendo 200/401/403/429 e o motivo.

### 3) Robustez na leitura do retorno da Z-API
Hoje o código faz `await response.json()` em alguns pontos. Se o Z-API responder texto/HTML em erro, isso pode gerar exceção e mascarar o erro real.
- Trocar para ler `await response.text()` e tentar `JSON.parse` com fallback.

### 4) Salvar mensagem de saída com metadados consistentes (UI)
Após envio bem-sucedido:
- Continuar salvando em `whatsapp_messages` como outgoing
- Garantir que `instance_name` seja a instância real (`instanceId`) e não `'ai-response'` (isso ajuda a UI a agrupar corretamente e evita confusão em multi-instância)
- Incluir `user_id` (o dono da instância) quando disponível, mantendo isolamento por tenant

---

## Arquivos afetados
- `supabase/functions/whatsapp-webhook/index.ts`
  - 2 blocos de envio (automations e IA)
  - logging e parse de resposta
  - header `Client-Token` opcional via secret

Opcional (somente se você confirmar que sua conta Z-API exige Client-Token):
- Adicionar secret: `Z_API_CLIENT_TOKEN` (token de segurança da conta, não o token da instância)

---

## Plano de teste (passo a passo)
1) Enviar uma mensagem do celular do lead para o WhatsApp conectado (a mesma conversa usada no teste).
2) Verificar:
   - Lead recebeu a resposta automática da IA no celular.
3) Abrir logs do Edge Function `whatsapp-webhook`:
   - Confirmar status `200` (ou ver o erro real vindo do Z-API no body).
4) Confirmar na interface do tenant `/demorais/whatsapp` que a mensagem aparece como outgoing (além de ter chegado no celular).

---

## Dúvida crítica (para fechar 100%)
A sua conta Z-API exige “Client-Token (Security Token)” além do token da instância na URL?
- Se sim: você tem esse token (diferente do token da instância)? Eu deixo o código pronto para usar o secret `Z_API_CLIENT_TOKEN`.
- Se não: remover o `Client-Token` resolve (é o cenário mais provável dado o erro “not allowed”).

