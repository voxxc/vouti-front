

## Correcao: Midias enviadas visiveis no chat + Gravacao de audio pelo microfone

### Problema 1: Midias enviadas nao aparecem no chat

Quando voce envia uma imagem, audio ou documento, a mensagem e salva no banco de dados com o `message_type` correto (ex: `image`), mas a **URL da midia nao e salva**. Ao recarregar as mensagens do banco, o sistema tenta extrair a URL do campo `raw_data` (que so existe para mensagens recebidas via webhook). Como mensagens enviadas nao tem `raw_data`, a midia desaparece.

**Solucao**: Salvar a `mediaUrl` dentro do campo `raw_data` na edge function `whatsapp-send-message`, usando o mesmo formato que o webhook usa para mensagens recebidas. Exemplo: para uma imagem, salvar `raw_data: { image: { imageUrl: "..." } }`.

Assim, quando o frontend carrega as mensagens, o mapeamento `rawData?.image?.imageUrl || rawData?.audio?.audioUrl || ...` funciona tanto para mensagens recebidas quanto enviadas.

---

### Problema 2: Botao do microfone nao funciona

O botao do microfone (Mic) e apenas um icone estatico sem logica. Precisa implementar gravacao de audio pelo navegador usando a API `MediaRecorder` do browser.

**Solucao**: Ao clicar no microfone, solicitar permissao do navegador para acessar o microfone, gravar o audio, e ao parar, fazer upload para o Supabase Storage e enviar como mensagem de audio.

Fluxo:
1. Clicar no Mic -> pedir permissao do navegador (`navigator.mediaDevices.getUserMedia`)
2. Iniciar gravacao com `MediaRecorder` (formato `audio/webm` ou `audio/ogg`)
3. Mostrar indicador visual de gravacao (tempo + botao de parar/cancelar)
4. Ao parar -> upload do blob para o bucket `message-attachments`
5. Enviar via `onSendMessage("", "audio", signedUrl)`

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-send-message/index.ts` | Salvar `mediaUrl` dentro de `raw_data` no formato compativel com o mapeamento do frontend |
| `src/components/WhatsApp/components/ChatPanel.tsx` | Implementar gravacao de audio com `MediaRecorder` no botao Mic; adicionar UI de gravacao (tempo, cancelar, enviar) |

### Detalhes tecnicos

**Edge function** - adicionar ao `messageRecord`:
```text
raw_data: mediaUrl ? { [messageType]: { [`${messageType}Url`]: mediaUrl } } : null
```

**ChatPanel** - novo estado e logica:
- `isRecording` / `recordingTime` para controlar a UI
- `MediaRecorder` API para capturar audio do microfone
- Timer visual mostrando duracao da gravacao
- Botao de cancelar (X vermelho) e enviar (Send verde) durante gravacao
- Upload do blob gerado para Supabase Storage
- Tratamento de erro caso o navegador negue permissao do microfone
