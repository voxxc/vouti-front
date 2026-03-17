

# Open Deadline Detail from Notification Click

## Problem
When a user clicks a `deadline_assigned` or `deadline_tagged` notification, nothing meaningful happens — it either tries project navigation (which may not exist) or does nothing. The user wants to see the deadline details directly.

## Approach

The notifications already store the deadline ID in `related_task_id`. We need to:

### 1. Add `onDeadlineNavigation` callback to `NotificationCenter`
- New optional prop: `onDeadlineNavigation?: (deadlineId: string) => void`
- In `handleNotificationClick`, when `type` is `deadline_assigned` or `deadline_tagged`, call `onDeadlineNavigation(notification.related_task_id)` instead of project navigation

### 2. Wire up `DeadlineDetailDialog` where `NotificationCenter` is used
- Find the parent component(s) that render `NotificationCenter` and add state for `deadlineDetailId` + `deadlineDetailOpen`
- Pass the callback to open the dialog, and render `<DeadlineDetailDialog>` alongside

## Files

| File | Action |
|------|--------|
| `src/components/Communication/NotificationCenter.tsx` | Add `onDeadlineNavigation` prop + handle deadline notification types |
| Parent component(s) rendering `NotificationCenter` | Add `DeadlineDetailDialog` state + pass callback |

