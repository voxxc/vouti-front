

# Fix: Notification Click Opens Detail for All Types

## Root Causes Found

1. **`useEtapaData.ts` (line 262)**: Still uses old title "Você foi mencionado" instead of "Mencionado em etapa" — so the NotificationCenter can't differentiate it by title keyword.

2. **All existing DB notifications have NULL `related_task_id`**: The `useCommentMentions.ts` code is correct now but the **deployed version** users are running still uses the old code. All 15+ recent `comment_mention` notifications in DB have `related_task_id: NULL` and title "Você foi mencionado".

3. **`NotificationCenter` routing relies on title keywords** but ALL existing notifications have the same generic title, so nothing routes correctly.

4. **`DashboardLayout` `onProcessoNavigation`** just navigates to `/controladoria` without opening a specific processo.

## Plan

### 1. Fix `useEtapaData.ts` — use type-specific title
Change line 262 from `'Você foi mencionado'` to `'Mencionado em etapa'` so the NotificationCenter can route etapa mentions correctly.

### 2. Fix `NotificationCenter.tsx` — also match by content keywords as fallback
Since existing notifications all have the generic title, add content-based fallback matching:
- Content contains "prazo" → `onDeadlineNavigation`
- Content contains "etapa" → navigate to project with `?etapa=` param
- Content contains "processo" → `onProcessoNavigation`
- Content contains "reunião" → (just close for now, no modal available)
- Content contains "tarefa" → navigate to project

This handles both old notifications (generic title, keyword in content) and new ones (specific title).

### 3. Fix `DashboardLayout.tsx` — make `onProcessoNavigation` actually useful
Currently it just navigates to `/controladoria` ignoring the processo ID. We should navigate to controladoria with a query param so the processo can be highlighted/opened.

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useEtapaData.ts` | Line 262: title → `'Mencionado em etapa'` |
| `src/components/Communication/NotificationCenter.tsx` | Enhance routing to match both title AND content keywords |
| `src/components/Dashboard/DashboardLayout.tsx` | Fix `onProcessoNavigation` to pass processo ID |

### Technical Detail

**NotificationCenter routing logic** (pseudocode):
```
function getCommentMentionTarget(notification):
  text = (notification.title + notification.content).toLowerCase()
  
  if text.includes('prazo') → 'deadline'
  if text.includes('etapa') → 'etapa' 
  if text.includes('processo') → 'processo'
  if text.includes('tarefa') → 'task'
  if text.includes('reunião') → 'reuniao'
  default → 'project'
```

This ensures both old and new notifications route correctly based on available context.

