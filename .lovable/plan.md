

# Fix: Comment Mentions Not Working + Notification Click Navigation

## Problems Found

1. **Mention regex bug in `MentionInput.tsx`**: The regex `/@([^@\s][^@]*?)` uses `[^@\s]` at start, which means it stops at the first space. So `@Izabelita Beatriz` only captures "Izabelita" -- never matching "Izabelita Beatriz" in participants, resulting in empty `mentionedUserIds`. This is why no notification was created.

2. **No navigation context in notifications**: The etapa comment notification (line 247-254 of `useEtapaData.ts`) inserts notifications without `related_project_id` or `related_task_id`, so clicking a notification does nothing useful.

3. **NotificationCenter has no deep navigation**: `handleNotificationClick` only calls `onProjectNavigation(projectId)` which navigates to `/project/:id` but doesn't open the specific protocolo/etapa where the comment was made.

## Fix Plan

### 1. Fix mention regex in `MentionInput.tsx` (lines 121, 197)

Change the extraction regex from:
```
/@([^@\s][^@]*?)(?=\s|$|@)/g
```
to a regex that matches full names (including spaces) by matching against known participant names directly, rather than regex guessing. We'll match `@FullName` against the participants list.

### 2. Fix notification insert in `useEtapaData.ts` (lines 247-254)

Add `related_project_id` and `related_task_id` (the etapa_id) to the notification so we know where to navigate. Also add the etapa name to the notification content for context. This requires passing the etapa info (which is available from the `etapaId` already in scope) and looking up the project_id from the protocolo chain.

### 3. Update `useEtapaData.ts` to fetch project context

When inserting the notification, query `project_protocolo_etapas` → `project_protocolos` to get `project_id`, then include it in the notification.

### 4. Enhance `NotificationCenter.tsx` click handler

For `comment_mention` notifications that have `related_project_id` and `related_task_id`:
- Navigate to `/project/:related_project_id` with a query param like `?etapa=:related_task_id` so the project page can auto-open the etapa modal.

### 5. Update `ProjectProtocoloContent.tsx` to handle URL-based etapa opening

Read the `?etapa=` query param on mount and auto-open the corresponding etapa modal.

## Files

| File | Action |
|------|--------|
| `src/components/Project/MentionInput.tsx` | **Fix** — rewrite mention extraction to match full names with spaces |
| `src/hooks/useEtapaData.ts` | **Fix** — add project context lookup + include `related_project_id`/`related_task_id` in notification |
| `src/components/Communication/NotificationCenter.tsx` | **Enhance** — navigate with etapa param for comment_mention notifications |
| `src/components/Project/ProjectProtocoloContent.tsx` | **Enhance** — auto-open etapa from URL query param |

## Technical Details

**MentionInput fix**: Instead of regex extraction, iterate over all participants and check if the text contains `@{participant.fullName}`. This guarantees multi-word names work.

**Notification context**: Before inserting notification, query:
```sql
SELECT pp.project_id FROM project_protocolo_etapas pe
JOIN project_protocolos pp ON pp.id = pe.protocolo_id
WHERE pe.id = :etapaId
```
Then insert notification with `related_project_id` and `related_task_id = etapaId`.

**Click navigation**: For `comment_mention` type, navigate to `/project/:related_project_id?etapa=:related_task_id`. The project page reads the param and auto-opens the etapa modal.

