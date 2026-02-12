

## Alterar formatacao do nome do agente nas mensagens

### O que muda

Na Edge Function `whatsapp-send-message`, a linha que monta a mensagem com o nome do agente sera alterada de:

```text
*AgentName*: mensagem aqui
```

Para:

```text
*AgentName*
mensagem aqui
```

### Mudanca tecnica

**Arquivo**: `supabase/functions/whatsapp-send-message/index.ts` (linha 22)

Trocar:
```text
const finalMessage = agentName ? `*${agentName}*: ${message}` : message;
```

Por:
```text
const finalMessage = agentName ? `*${agentName}*\n${message}` : message;
```

### Resultado

- O nome do agente aparece em negrito na primeira linha
- A mensagem aparece na linha de baixo, separada visualmente
- Mensagens do Super Admin continuam sem prefixo (sem mudanca)

