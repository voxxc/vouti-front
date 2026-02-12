

## Adicionar linha extra entre nome do agente e mensagem

### Mudanca

**Arquivo**: `supabase/functions/whatsapp-send-message/index.ts`

Alterar a construcao do `finalMessage` de:

```text
*AgentName*\nmensagem
```

Para:

```text
*AgentName*\n\nmensagem
```

Ou seja, trocar `\n` por `\n\n` para criar uma linha em branco entre o nome em negrito e o texto da mensagem.

### Resultado

O destinatario vera:

```text
*AgentName*

mensagem aqui
```

Em vez de:

```text
*AgentName*
mensagem aqui
```

