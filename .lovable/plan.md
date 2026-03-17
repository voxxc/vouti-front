

# Fix: Comment Mentions Notifications + Deep-Linking for All Sections

## Problem

Mentions ARE being saved to `comment_mentions` and notifications ARE being created — but every `comment_mention` notification has `related_project_id: NULL` and `related_task_id: NULL`. This means clicking a notification does nothing. The `useCommentMentions` hook creates generic notifications without any reference to the source entity (deadline, processo, reunião, parcela, task).

Additionally, `NotificationCenter` only handles deep-linking for etapa mentions and deadline assignments — it has no logic to open a deadline detail, processo detail, etc. from a comment mention.

## Fix

### 1. Update `useCommentMentions` to accept and store entity context

Add optional params `relatedEntityId` and `relatedProjectId` to `SaveMentionsParams`. The notification will store:
- `related_task_id` = the entity ID (deadline_id, processo_id, reuniao_id, parcela_id, task_id, etapa_id)
- `related_project_id` = project ID if available
- Append `commentType` to the notification content so the click handler knows what to open

### 2. Update all comment hooks to pass entity ID

Each hook already has the entity ID in scope. Pass it through to `saveMentions`:
- `useDeadlineComentarios` → `relatedEntityId: deadlineId`
- `useProcessoComentarios` → `relatedEntityId: processoId`
- `useReuniaoComentarios` → `relatedEntityId: reuniaoId`
- `useTaskComentarios` → `relatedEntityId: taskId`
- `useParcelaComentarios` → `relatedEntityId: parcelaId`

### 3. Store comment type in notification metadata

Use a convention in the notification: store the `commentType` as a JSON field or encode it in the content. Since the `notifications` table doesn't have a metadata column, we'll encode the type in `related_task_id` usage and differentiate by notification content pattern, OR better: we can use the notification `type` field more granularly.

Actually, looking at the constraint, only `comment_mention` is allowed. So we'll encode the comment source type by adding a small `// deadline:UUID` marker in the notification content, or more cleanly: store `related_task_id = entityId` and add a prefix to the title like "Mencionado em prazo" / "Mencionado em processo" etc. The `NotificationCenter` can then match on title/content keywords to decide what to open.

**Better approach**: Store `related_task_id = entityId` and differentiate by notification title:
- "Mencionado em prazo" → open DeadlineDetailDialog
- "Mencionado em processo" → navigate to controladoria with processo
- "Mencionado em reunião" → open reunião
- "Mencionado em tarefa" → navigate to project
- "Mencionado em etapa" → navigate to project with etapa param

### 4. Update `NotificationCenter.handleNotificationClick`

For `comment_mention` notifications, check the content/title to determine the source type:
- If title contains "prazo" → call `onDeadlineNavigation(related_task_id)`
- If title contains "etapa" → navigate to project with `?etapa=related_task_id`
- If title contains "processo" → call `onProcessoNavigation(related_task_id)`
- Default: navigate to project if `related_project_id` exists

### 5. Update `useCommentMentions` notification insert

The core change — add `related_task_id` and use descriptive title per comment type:

```typescript
const typeTitles: Record<CommentType, string> = {
  deadline: 'Mencionado em prazo',
  reuniao: 'Mencionado em reunião', 
  reuniao_cliente: 'Mencionado em reunião',
  parcela: 'Mencionado em parcela',
  task: 'Mencionado em tarefa',
  processo: 'Mencionado em processo',
};
```

## Files

| File | Action |
|------|--------|
| `src/hooks/useCommentMentions.ts` | Add `relatedEntityId` param, store in notification `related_task_id`, use type-specific titles |
| `src/hooks/useDeadlineComentarios.ts` | Pass `deadlineId` as `relatedEntityId` |
| `src/hooks/useProcessoComentarios.ts` | Pass `processoId` as `relatedEntityId` |
| `src/hooks/useReuniaoComentarios.ts` | Pass `reuniaoId` as `relatedEntityId` |
| `src/hooks/useTaskComentarios.ts` | Pass `taskId` as `relatedEntityId` |
| `src/hooks/useClienteParcelas.ts` | Pass `parcelaId` as `relatedEntityId` |
| `src/components/Communication/NotificationCenter.tsx` | Route `comment_mention` clicks by title keyword to appropriate handler |

