

## Causa raiz / Justificativa

Quatro melhorias independentes no Planejador:

1. **Cards "não abertos hoje"** — não há rastreamento de quando o usuário abriu cada card pela última vez. Falta marcar visualmente cards que precisam de atenção naquele dia.
2. **Shift+Enter no chat** — o input de mensagem é um `<Input>` (HTML `<input>`), que não permite quebra de linha. Precisa virar `<Textarea>` com lógica de Enter (envia) vs Shift+Enter (quebra linha).
3. **Editar comentários** — o `PlanejadorTaskChat` só permite apagar mensagens próprias; não há fluxo de edição.
4. **Marcar participantes (@menção real) com notificação clicável** — o chat já detecta `@nome` na UI, mas: (a) só notifica owner + participantes da tarefa, não o usuário mencionado especificamente; (b) navegação da notificação para a tarefa **já existe** (`onPlanejadorTaskNavigation` → abre o drawer e seleciona a task via `initialTaskId`).

## Correção / Implementação

### 1. Cards laranja quando não abertos hoje
- **Nova tabela** `planejador_task_views` (`task_id`, `user_id`, `tenant_id`, `last_viewed_at`) com unique `(task_id, user_id)` e RLS por `tenant_id`.
- **Hook** `usePlanejadorTaskViews()` — busca todos os registros do usuário atual e expõe `Set<task_id>` de tarefas vistas hoje.
- **Mutation** `markTaskAsViewed(taskId)` — upsert do `last_viewed_at = now()` quando usuário abre o card (chamada no `onClick` que já existe → `setSelectedTask`).
- **PlanejadorTaskCard.tsx** — quando a task **não** está em `viewedTodayIds` E status ≠ `completed` E foi criada/atualizada antes de hoje, aplicar borda + fundo laranja sutil (`border-orange-400`, `bg-orange-50/60 dark:bg-orange-900/20`). Não aplicar a tasks recém-criadas pelo próprio usuário (proprietário marca como vista automaticamente na criação).
- Cards concluídos não recebem a cor (já vão pra coluna "Concluído").

### 2. Shift+Enter para quebra de linha no chat
- Trocar `<Input ref={inputRef}>` por `<Textarea>` (auto-resize ~1-4 linhas) no `PlanejadorTaskChat.tsx`.
- Atualizar `inputRef` para `HTMLTextAreaElement`.
- `handleKeyDown`: se `Enter && !shiftKey` → `handleSend()`; se `Enter && shiftKey` → comportamento padrão (quebra de linha).
- Render das mensagens já tem `whitespace-pre-wrap` → quebras serão exibidas corretamente.

### 3. Editar comentários próprios
- Adicionar item **"Editar mensagem"** no `DropdownMenu` que já existe (junto ao "Apagar mensagem").
- Estado local `editingMessageId` + `editingContent`. Quando ativo, o balão renderiza um `<Textarea>` inline com botões "Salvar" / "Cancelar".
- **Mutation** `updateMessage` → update no `planejador_task_messages` com `content` + novo campo `edited_at` (timestamp).
- **Migration**: adicionar coluna `edited_at timestamptz NULL` em `planejador_task_messages`.
- Mensagens editadas mostram `(editado)` em itálico discreto após o timestamp.

### 4. Notificar participantes mencionados (@) + clique abre tarefa
- No `sendMessage` do `PlanejadorTaskChat`, antes de enviar:
  - Parsear `@Nome Completo` do conteúdo via mesma regex usada em `renderContent`.
  - Match contra `profiles` do tenant → coletar `mentioned_user_ids`.
- Criar notificação **separada** do tipo já existente `comment_mention` para cada usuário mencionado (com prioridade sobre o `planejador_chat_message` genérico — se for mencionado, recebe só a de mention).
  - `title`: `Você foi mencionado em: {taskTitle}`
  - `content`: `${senderName}: "${truncatedMsg}"`
  - `related_task_id`: `taskId`
- **Roteamento**: o `NotificationCenter.handleNotificationClick` já trata `comment_mention` mas roteia por keywords ("etapa", "protocolo"). Adicionar branch: se `title` contiver "Planejador" ou se nenhum keyword bater E `related_task_id` existir + `onPlanejadorTaskNavigation` disponível → abrir Planejador na tarefa.
- O fluxo já está pronto via `setPendingPlanejadorTaskId` → `initialTaskId` → `setSelectedTask` (linhas 110-123 do `PlanejadorDrawer.tsx`).

## Arquivos afetados

- **Migration nova**: tabela `planejador_task_views` + RLS + coluna `edited_at` em `planejador_task_messages`.
- `src/hooks/usePlanejadorTaskViews.ts` — **novo**.
- `src/components/Planejador/PlanejadorTaskCard.tsx` — destaque laranja.
- `src/components/Planejador/PlanejadorKanban.tsx` — passar `viewedTodayIds` ao card.
- `src/components/Planejador/PlanejadorDrawer.tsx` — chamar `markTaskAsViewed` ao abrir.
- `src/components/Planejador/PlanejadorTaskChat.tsx` — Textarea, Shift+Enter, editar mensagem, notificação de mention.
- `src/components/Communication/NotificationCenter.tsx` — fallback de `comment_mention` para Planejador.

## Impacto

- **Usuário final (UX)**:
  - Cards não abertos no dia ficam **destacados em laranja** → atalho visual pra "tarefas pendentes de revisão". Some sozinho assim que clicar pra abrir.
  - Comentários do chat ganham **multilinha** (Shift+Enter) → comentários longos com parágrafos ficam organizados.
  - Possibilidade de **editar comentário próprio** → conserto rápido de erro de digitação sem precisar apagar/reenviar. Mensagens editadas sinalizadas com `(editado)`.
  - **Mencionar @Nome** dispara notificação **direta** ao usuário, e clicar nela **abre a tarefa exata** dentro do drawer do Planejador → fluxo completo de colaboração.
- **Dados**:
  - Nova tabela `planejador_task_views` (1 row por usuário×task aberta) — volume baixo, índice em `(user_id, task_id)`.
  - Coluna `edited_at` em `planejador_task_messages` — nullable, sem reescrita de dados existentes.
  - RLS estrito por `tenant_id` em ambas as mudanças.
- **Performance**: 1 query extra por sessão (todas as views do user no tenant) + 1 upsert por click. Negligível.
- **Riscos colaterais**:
  - **Baixo**. Coluna `edited_at` é opt-in. Tabela de views é isolada.
  - Atenção: se o usuário **criar** uma tarefa, ela já vem "marcada como vista" pra ele — evita aparecer laranja imediatamente. Outros usuários do tenant verão laranja até abrirem.
  - Se nenhum usuário abrir uma task antiga, ela continua laranja todos os dias até alguém abrir — comportamento correto (é o ponto: alertar).
- **Quem é afetado**:
  - **Todos os usuários do Planejador** ganham as 4 melhorias.
  - Nada muda pra admins especificamente — é UX geral.

## Validação

1. **Card laranja**: criar tarefa hoje com outro usuário → logar como você → abrir Planejador → card aparece laranja → clicar → cor normal. Recarregar → continua normal. Amanhã → fica laranja de novo se não abrir.
2. **Shift+Enter**: abrir chat de uma tarefa → digitar "linha 1" → Shift+Enter → "linha 2" → Enter → mensagem enviada com 2 linhas visíveis.
3. **Editar comentário**: enviar mensagem → menu 3-pontos → "Editar" → alterar texto → Salvar → mensagem atualizada com `(editado)`.
4. **Menção + notificação**: chat → digitar `@Nome` (do popup) → enviar → outro usuário recebe notificação "Você foi mencionado…" → clicar → Planejador abre na tarefa exata.

