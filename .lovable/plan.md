

## Correcao: Mensagem enviada pelo celular cria conversa com numero estranho (LID)

### Problema

Quando voce envia uma mensagem pelo celular, a Z-API envia o webhook com `phone: "23081254949024@lid"` (um identificador interno do WhatsApp chamado LID) ao inves do numero real do contato (`5545999180026`). O sistema salva esse LID como `from_number`, criando uma conversa separada com um numero sem sentido.

### Causa

A funcao `normalizePhoneNumber` apenas limpa caracteres nao-numericos, transformando `"23081254949024@lid"` em `"23081254949024"`. Ela nao detecta que isso e um LID e nao um telefone real.

### Solucao

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

1. **Detectar formato LID no campo `phone`**: Se o telefone contem `@lid` ou nao comeca com `55` e tem formato incompativel com telefone brasileiro, buscar o numero real em campos alternativos do payload da Z-API.

2. **Extrair telefone real de campos alternativos**: O payload da Z-API para mensagens `fromMe: true` inclui o campo `connectedPhone` (seu numero) e outros campos. Para mensagens enviadas, o numero do destinatario pode ser extraido de:
   - `data.chatId` (formato `5545999180026@c.us`)
   - `data.to` (numero direto em alguns payloads)
   - Buscar no banco a ultima mensagem recebida do mesmo `chatLid`

3. **Fallback com busca no banco**: Se nenhum campo alternativo tiver o numero real, buscar na tabela `whatsapp_messages` a ultima mensagem recebida que tenha o mesmo `chatLid` no `raw_data`, e usar o `from_number` dessa mensagem.

### Alteracoes detalhadas

**`supabase/functions/whatsapp-webhook/index.ts` - funcao `handleIncomingMessage`**

Adicionar logica ANTES da normalizacao para resolver o LID:

```text
handleIncomingMessage(data):
  1. Extrair phone do payload
  2. NOVO: Se phone contem "@lid" ou nao parece telefone valido:
     a. Tentar extrair de data.chatId (remover @c.us)
     b. Tentar extrair de data.to
     c. Se nenhum funcionou: buscar no banco whatsapp_messages
        onde raw_data->chatLid = phone_original
        e direction = 'received'
        pegar from_number da ultima mensagem
     d. Se ainda nao encontrou: logar aviso e descartar
  3. Normalizar o telefone resolvido
  4. Continuar processamento normal
```

**`supabase/functions/whatsapp-webhook/index.ts` - funcao `normalizePhoneNumber`**

Adicionar deteccao de LID para rejeitar numeros que claramente nao sao telefones:

```text
normalizePhoneNumber(phone):
  - Remover @lid, @c.us e outros sufixos WhatsApp
  - Se resultado nao comeca com 55 e tem mais de 13 digitos: retornar vazio
  - Logica existente de adicionar 9o digito
```

### Resumo

O problema e que a Z-API usa um identificador interno (LID) em vez do numero real para mensagens `fromMe`. A correcao detecta esse formato e busca o numero real em campos alternativos do payload ou no historico de mensagens do banco.

