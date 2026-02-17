

## Suporte a Midias no Chat do Vouti.CRM (Audios, Fotos, Videos, Documentos)

### O que muda

Implementar envio e recebimento de midias (imagens, audios, videos e documentos) no chat do CRM, aproveitando os endpoints especificos da Z-API e os dados que o webhook ja entrega.

---

### 1. Webhook: Capturar midias recebidas corretamente

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Atualmente o webhook salva tudo como `message_type: 'text'` e pega apenas `text?.message`. Precisa detectar o tipo de midia e extrair a URL do arquivo.

**Logica:**
- Detectar tipo de mensagem via campo `type` ou presenca de `image`, `audio`, `video`, `document` no payload do webhook
- Extrair a URL da midia (campo `image.imageUrl`, `audio.audioUrl`, `video.videoUrl`, `document.documentUrl` conforme Z-API)
- Salvar no DB com `message_type` correto (`image`, `audio`, `video`, `document`) e a URL da midia no campo `message_text` (ou armazenar a URL no `raw_data` que ja e salvo)
- O `message_text` pode conter o caption (legenda) quando houver

Mapeamento Z-API esperado:

| Campo webhook | message_type | URL |
|---|---|---|
| `image` | `image` | `image.imageUrl` |
| `audio` | `audio` | `audio.audioUrl` |
| `video` | `video` | `video.videoUrl` |
| `document` | `document` | `document.documentUrl` |

---

### 2. Edge Function de envio: Endpoints especificos da Z-API

**Arquivo:** `supabase/functions/whatsapp-send-message/index.ts`

Atualmente usa `send-file-url` generico para Z-API. Mudar para endpoints especificos:

| messageType | Endpoint Z-API |
|---|---|
| `text` | `/send-text` |
| `image` | `/send-image` |
| `audio` | `/send-audio` |
| `video` | `/send-video` |
| `document` | `/send-document` |

Cada endpoint recebe: `{ phone, image/audio/video/document: mediaUrl, caption?: message }` (formato varia por tipo).

Tambem atualizar o `message_type` salvo no DB para refletir o tipo real ao inves de sempre `'text'`.

---

### 3. Interface WhatsAppMessage: Adicionar campos de midia

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppInbox.tsx`

Expandir a interface:

```text
export interface WhatsAppMessage {
  id: string;
  messageText: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  isFromMe: boolean;
  messageType: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
}
```

Atualizar todos os locais que montam `WhatsAppMessage` (Inbox, AllConversations, LabelConversations) para extrair `message_type` e `mediaUrl` do `raw_data`.

---

### 4. ChatPanel: Renderizar midias e permitir envio

**Arquivo:** `src/components/WhatsApp/components/ChatPanel.tsx`

**Recebimento (renderizacao):**
- `image`: Renderizar `<img>` clicavel (abre em nova aba)
- `audio`: Renderizar `<audio controls>` nativo do navegador
- `video`: Renderizar `<video controls>` nativo
- `document`: Renderizar link para download com icone de arquivo

**Envio:**
- Botao de Paperclip (ja existe) abre um `<input type="file">` para selecionar arquivo
- Detectar tipo pelo MIME type do arquivo selecionado
- Upload do arquivo para o bucket `message-attachments` do Supabase Storage
- Obter URL publica/signed e enviar via edge function com `messageType` correto e `mediaUrl`
- Atualizar `onSendMessage` para aceitar tipo e URL: `onSendMessage(text, messageType?, mediaUrl?)`

---

### 5. Bucket de Storage

O bucket `message-attachments` ja existe (privado). Sera necessario criar uma policy de INSERT para usuarios autenticados e uma policy de SELECT para leitura das midias.

---

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Detectar tipo de midia, extrair URL, salvar message_type correto |
| `supabase/functions/whatsapp-send-message/index.ts` | Usar endpoints Z-API especificos (send-image, send-audio, etc) |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Expandir interface WhatsAppMessage, mapear campos de midia |
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Mapear campos de midia na formatacao |
| `src/components/WhatsApp/sections/WhatsAppLabelConversations.tsx` | Mapear campos de midia na formatacao |
| `src/components/WhatsApp/components/ChatPanel.tsx` | Renderizar midias + botao de envio de arquivos com upload ao Storage |
| Migracao SQL | Policies de storage para bucket `message-attachments` |

