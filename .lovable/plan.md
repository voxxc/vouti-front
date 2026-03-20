

# Bate-papo funcional do Planejador: menções, respostas, fotos e áudios

## Resumo

Transformar o chat da tarefa em um chat completo estilo WhatsApp, com menções a usuários (@), resposta a mensagens, envio de fotos e gravação de áudios.

## 1. Schema — Novas colunas na tabela `planejador_task_messages`

Adicionar 4 colunas:
- `reply_to_id uuid REFERENCES planejador_task_messages(id)` — resposta a outra mensagem
- `message_type text DEFAULT 'text'` — tipo: `text`, `image`, `audio`
- `file_url text` — URL do arquivo no storage
- `file_name text` — nome original do arquivo

Criar bucket de storage `planejador-chat-files` (público para leitura) com policies para upload/leitura por autenticados.

## 2. Buscar nomes dos membros do tenant

No componente, buscar `profiles` do tenant (user_id, full_name) para:
- Renderizar o nome do remetente em cada mensagem
- Popular o dropdown de menções ao digitar `@`

## 3. Funcionalidades do chat

### Menções (@)
- Ao digitar `@`, abrir popup com lista de membros do tenant filtrada pelo que o usuário digita
- Ao selecionar, inserir `@Nome` no texto
- Na renderização, destacar `@Nome` com cor diferente (bold/primary)

### Responder mensagem
- Long-press ou botão de reply em cada mensagem
- Estado `replyingTo` com preview acima do input (igual ao `MessageInput` existente)
- Salvar `reply_to_id` ao enviar
- Na renderização, mostrar quote da mensagem respondida

### Envio de fotos
- Botão de anexo (Paperclip) no input
- Upload para `planejador-chat-files/{userId}/{taskId}/{timestamp}.ext`
- Salvar mensagem com `message_type: 'image'`, `file_url`, `file_name`
- Renderizar como imagem clicável na bolha

### Gravação de áudio
- Botão de microfone que inicia `MediaRecorder`
- Indicador visual de gravação (pulsante)
- Ao parar, upload do blob como `.webm` para o storage
- Salvar com `message_type: 'audio'`
- Renderizar como player de áudio compacto na bolha

## 4. Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar colunas `reply_to_id`, `message_type`, `file_url`, `file_name` + bucket + policies |
| `PlanejadorTaskChat.tsx` | Reescrever com: busca de profiles, menções popup, reply state, upload de fotos, gravação de áudio, renderização rica |

## Detalhes técnicos

- **Menções**: Regex `/(?:^|\s)@(\S*)$/` no input para detectar trigger; popup posicionado acima do input com lista filtrável
- **Áudio**: `navigator.mediaDevices.getUserMedia({ audio: true })` → `MediaRecorder` → blob → upload
- **Storage**: bucket `planejador-chat-files`, público, com policy de insert para authenticated
- **Renderização**: Parse do conteúdo para destacar `@mentions`; quote block para replies; `<img>` para imagens; `<audio>` para áudios

