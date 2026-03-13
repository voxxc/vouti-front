

# Correção: Mensagens outgoing atribuídas ao contato errado

## Causa raiz
Na função `resolvePhoneFromLid` (webhook), o **passo 3.5** busca a mensagem recebida mais recente na instância e usa esse telefone como destino. Isso é fundamentalmente errado — se Laura mandou a última mensagem, qualquer mensagem outgoing vai para a conversa dela.

Os passos 4 e 5 (busca por `chatName`) são mais precisos mas ficam inalcançáveis porque o 3.5 retorna primeiro.

## Correção

### `supabase/functions/whatsapp-webhook/index.ts`

Reordenar a resolução de LID para priorizar métodos precisos:

1. **chatId** (passo 1) — mantém
2. **chatLid** (passo 2) — mantém  
3. **campo "to"** (passo 3) — mantém
4. **chatName em contatos** (antigo passo 4) — **sobe para antes do 3.5**
5. **chatName no histórico** (antigo passo 5) — **sobe para antes do 3.5**
6. **LID no histórico** (antigo passo 6) — sobe também
7. **Fallback por mensagem recente** (antigo passo 3.5) — **desce para ÚLTIMO recurso**, e mesmo assim com melhoria: se houver `chatName`, tentar correlacionar em vez de pegar qualquer mensagem recente

Adicionalmente, o fallback (antigo 3.5) deve ser limitado: só usar se não houver `chatName` disponível, pois quando há chatName os passos 4/5 são mais confiáveis.

### Nenhuma mudança no frontend
O problema é 100% no webhook — a resolução de telefone está retornando o número errado.

### Arquivo a modificar
- `supabase/functions/whatsapp-webhook/index.ts` — reordenar passos da função `resolvePhoneFromLid`

