

## Correcao: Resolucao de LID falhando - mensagens do celular descartadas

### Problema Identificado

Os logs confirmam que o LID e detectado corretamente, mas todas as 3 estrategias de resolucao falham:

1. **`data.chatId`**: O payload da Z-API usa `chatLid`, nao `chatId`. O codigo atual verifica `data.chatId` que nunca existe.
2. **`data.to`**: Nao existe no payload da Z-API para mensagens `fromMe`.
3. **Busca no banco**: O codigo remove `@lid` do valor antes de buscar (`"54146770170054"`), mas no banco o campo `raw_data->>'chatLid'` esta salvo com o sufixo completo (`"54146770170054@lid"`). A query nunca encontra match.

### Solucao

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts` - funcao `resolvePhoneFromLid`**

Tres correcoes:

1. Verificar `data.chatLid` alem de `data.chatId` - extrair o numero se estiver no formato `phone@c.us`
2. Na busca no banco, usar o valor original COM `@lid` para comparar com `raw_data->>'chatLid'`
3. Adicionar busca alternativa: procurar mensagens recebidas (direction='received') na mesma instancia que tenham o mesmo `chatLid` no raw_data, pois essas mensagens recebidas do mesmo contato CONTEM o telefone real no campo `phone`/`from_number`

A logica corrigida:

```text
resolvePhoneFromLid(data, originalPhone):
  1. Tentar data.chatId (formato 55xxxx@c.us) - manter existente
  2. NOVO: Tentar data.chatLid - se formato phone@c.us, extrair
  3. Tentar data.to - manter existente
  4. CORRIGIDO: Buscar no banco usando originalPhone COM @lid:
     SELECT from_number FROM whatsapp_messages
     WHERE direction = 'received'
       AND raw_data->>'chatLid' = '54146770170054@lid'  (valor original)
     ORDER BY timestamp DESC LIMIT 1
```

A chave e que mensagens RECEBIDAS do mesmo contato tem `chatLid: "54146770170054@lid"` E `from_number: "5545999906046"`. Entao buscando por `chatLid` com o valor completo, encontramos o telefone real.

### Arquivo modificado

1. `supabase/functions/whatsapp-webhook/index.ts` - Funcao `resolvePhoneFromLid`

