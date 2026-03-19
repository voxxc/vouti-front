

# Fix: Notificação de menção em protocolo deve abrir o projeto com o protocolo

## Problema

Quando alguém é mencionado em um comentário de **protocolo**, a notificação:
1. Usa `commentType: 'task'` (genérico) — então o título diz "Mencionado em tarefa" em vez de "Mencionado em protocolo"
2. Não salva `related_project_id` — então o NotificationCenter não sabe para qual projeto navegar
3. O NotificationCenter não tem lógica para abrir o **Project Drawer** diretamente na aba de protocolos com o protocolo correto selecionado

## Solução

### 1. Enriquecer notificação de protocolo no `ProjectProtocoloContent.tsx`

Onde `TaskComentarios` é usado para o protocolo (linha 449), precisamos passar contexto extra para que o `useTaskComentarios` crie notificações com tipo e contexto corretos.

**Abordagem**: Adicionar um novo tipo `'protocolo'` ao `useCommentMentions` e criar um novo wrapper ou prop em `TaskComentarios` para permitir sobrescrever o `commentType` e passar `relatedProjectId`.

Alternativamente (mais simples): Modificar `TaskComentarios` para aceitar props opcionais `commentType`, `contextTitle`, e `relatedProjectId` que são repassados ao `saveMentions`.

### 2. Atualizar `useCommentMentions.ts`

Adicionar tipo `'protocolo'` ao `CommentType`:
- `typeTitles`: `'Mencionado em protocolo'`
- `typeLabels`: `'um protocolo'`

### 3. Atualizar `TaskComentarios.tsx`

Adicionar props opcionais:
- `commentType?: CommentType` (default `'task'`)
- `contextTitle?: string`
- `relatedProjectId?: string`

Repassar ao `useTaskComentarios` → `saveMentions`.

### 4. Atualizar `useTaskComentarios.ts`

Aceitar parâmetros opcionais de override para `saveMentions`:
- `commentType`, `contextTitle`, `relatedProjectId`

### 5. Atualizar `ProjectProtocoloContent.tsx`

Na linha 449, passar:
```tsx
<TaskComentarios 
  taskId={protocolo.id} 
  currentUserId={user?.id || ''} 
  commentType="protocolo"
  contextTitle={protocolo.nome}
  relatedProjectId={projectId}
/>
```

### 6. Atualizar `NotificationCenter.tsx`

- Adicionar keyword `'protocolo'` na detecção (antes de `'tarefa'`)
- Para target `'protocolo'`: buscar `project_id` do protocolo via `project_protocolos`, e chamar `onProjectNavigation` com `projectId?protocolo=protocoloId`

### 7. Atualizar `DashboardLayout.tsx`

No `onProjectNavigation`, verificar se há query params (`?protocolo=`). Se sim, abrir o ProjectDrawer com o projeto correto e o protocolo pré-selecionado. Adicionar lógica para interpretar a URL e abrir o drawer.

### 8. Atualizar `ProjectProtocolosList.tsx`

Adicionar `useEffect` para ler `?protocolo=UUID` dos search params e auto-abrir o protocolo correto (similar ao que já existe para `?etapa=`).

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCommentMentions.ts` | Adicionar tipo `'protocolo'` |
| `src/components/Project/TaskComentarios.tsx` | Props opcionais: `commentType`, `contextTitle`, `relatedProjectId` |
| `src/hooks/useTaskComentarios.ts` | Repassar overrides ao `saveMentions` |
| `src/components/Project/ProjectProtocoloContent.tsx` | Passar `commentType="protocolo"` e `relatedProjectId` |
| `src/components/Communication/NotificationCenter.tsx` | Lookup assíncrono do `project_id` para notificações de protocolo |
| `src/components/Dashboard/DashboardLayout.tsx` | Abrir ProjectDrawer ao navegar para protocolo |
| `src/components/Project/ProjectProtocolosList.tsx` | Auto-abrir protocolo via `?protocolo=UUID` |

