

## Correcao: Commander nao salva mensagens e nao responde

### Causa raiz

O webhook crashou porque usa a variavel `effectiveAgentId` na linha 255, mas essa variavel so e definida na linha 291 (apos o bloco do Commander). Isso gera um `ReferenceError` que interrompe toda a execucao, causando:

1. Mensagem do Commander **nao e salva** no banco (insert falha junto com o crash)
2. A edge function `whatsapp-commander` **nunca e invocada** (o codigo nao chega la)
3. O log mostra "Error processing webhook" em todas as tentativas

### Correcao

**Arquivo: `supabase/functions/whatsapp-webhook/index.ts`**

Substituir `effectiveAgentId` por `instance.agent_id` dentro do bloco Commander (linhas 255 e 275), pois nesse ponto do codigo a variavel correta e `instance.agent_id` que ja foi carregada na query da instancia.

Linhas afetadas:
- Linha 255: `agent_id: effectiveAgentId` -> `agent_id: instance.agent_id || null`
- Linha 275: `agent_id: effectiveAgentId` -> `agent_id: instance.agent_id || null`

Nenhuma outra mudanca necessaria. O `whatsapp-commander` ja esta correto e pronto para funcionar assim que o webhook conseguir invoca-lo.

