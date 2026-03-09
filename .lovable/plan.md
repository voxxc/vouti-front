

# Fix: WhatsApp Real-time Sync + Conversation Ordering

## Root Causes Identified

### 1. Table Missing from Realtime Publication (MAIN CAUSE)
The `whatsapp_sync_signals` table was created but **never added to `supabase_realtime` publication**. Without this, Supabase Realtime will NOT broadcast INSERT events to the frontend — the subscription sits idle forever.

### 2. Webhook "Error processing webhook" on some calls
The webhook logs show alternating errors. The sync signal `.catch()` pattern doesn't properly handle Supabase client errors. Need to make the signal emission more robust.

### 3. Conversations not reordering on new messages
When new messages arrive, conversations need to bubble to the top of the list, show updated unread counts, and display the latest message preview.

## Solution

### Fix 1 — Add table to Realtime publication (SQL Migration)
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sync_signals;
```
This is the single line that makes everything work.

### Fix 2 — Improve conversation ordering in `WhatsAppInbox.tsx`
After `loadConversations` builds the conversation list, sort by `lastMessageTime` descending so the most recent conversation is always on top. Currently conversations are ordered by first occurrence in the message results, but need explicit sort.

### Fix 3 — Make `SuperAdminWhatsAppInbox.tsx` use the same pattern
Add sorting and ensure the SuperAdmin inbox also reorders conversations on new messages.

### Fix 4 — Improve sync signal error handling in webhook
Replace `.catch()` with proper error handling to avoid silent failures and ensure the webhook doesn't crash.

## Files to Change

| File | Change |
|------|--------|
| New SQL migration | `ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sync_signals` |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Sort conversations by `lastMessageTime` desc after building list |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx` | Same sorting fix |
| `supabase/functions/whatsapp-webhook/index.ts` | Robust sync signal emission with try/catch |

