

## Commander: Suporte a Audio + Historico de Conversa

### Problemas identificados

1. **Sem historico**: Quando o Commander envia uma mensagem, o webhook faz `return` na linha 261 sem salvar a mensagem no banco. Isso faz a conversa "sumir" da Caixa de Entrada.

2. **Sem suporte a audio**: O Commander so extrai texto (`text?.message`). Se o Commander enviar um audio, a Z-API entrega o campo `audio.audioUrl` mas o codigo ignora e nao processa nada.

3. **Respostas do bot tambem nao aparecem**: A funcao `sendWhatsAppReply` no `whatsapp-commander` envia a resposta pela Z-API mas nao salva no banco.

### Mudancas

---

**1. `supabase/functions/whatsapp-webhook/index.ts` - Salvar mensagem do Commander ANTES de redirecionar**

Mover o bloco de salvamento para antes do `return`, para que a mensagem do Commander apareca normalmente na Caixa de Entrada:

```text
if (commander) {
  // 1. SALVAR a mensagem normalmente (igual mensagem recebida)
  await supabase.from('whatsapp_messages').insert({ ... direction: 'received' ... });

  // 2. Extrair texto OU audioUrl
  const mediaInfo = detectMediaInfo(data);
  const messageText = text?.message || mediaInfo.caption || '';
  const audioUrl = mediaInfo.messageType === 'audio' ? mediaInfo.mediaUrl : null;

  // 3. Invocar Commander com texto ou audioUrl
  fetch(.../whatsapp-commander, { body: { phone, message: messageText, audioUrl, ... } });
  
  // 4. NÃO processar IA/automacoes, mas mensagem JA esta salva
  return;
}
```

---

**2. `supabase/functions/whatsapp-commander/index.ts` - Transcrever audio + salvar respostas**

Adicionar:

- **Transcricao de audio**: Se receber `audioUrl` em vez de texto, baixar o audio e enviar para a API de Speech-to-Text (Lovable AI Gateway) para transcrever antes de processar o comando
- **Salvar respostas no banco**: Apos enviar a resposta pelo WhatsApp, salvar como mensagem `outgoing` no `whatsapp_messages` para que apareca no historico

Para transcricao, usar o endpoint de STT do Lovable AI Gateway:

```text
1. Baixar audio da URL fornecida pela Z-API
2. Enviar para https://ai.gateway.lovable.dev/v1/audio/transcriptions (modelo: whisper-1)
3. Usar o texto transcrito como input para o tool calling
```

Fluxo atualizado:

```text
Commander envia audio
  -> Webhook salva mensagem + detecta audioUrl
  -> Invoca whatsapp-commander com audioUrl
  -> Commander baixa audio, transcreve via AI Gateway
  -> Processa comando normalmente via tool calling
  -> Envia resposta pelo WhatsApp
  -> Salva resposta no banco (outgoing)
```

---

**3. Parametro `agent_id` no Commander**

Passar o `agent_id` da instancia para o Commander, para que as mensagens de resposta sejam salvas com o agente correto e aparecam na Caixa de Entrada do agente.

---

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Salvar mensagem do Commander no banco antes de redirecionar; enviar audioUrl para o Commander |
| `supabase/functions/whatsapp-commander/index.ts` | Adicionar transcricao de audio via AI Gateway; salvar respostas como mensagem outgoing no banco |

