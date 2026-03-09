
# Fix: Sincronização WhatsApp em Tempo Real

## Raiz dos Problemas

### 1. Hook Recriado em Loop (console logs confirmam)
O `useWhatsAppSync` tem callbacks no array de dependências (`onConversationUpdate`, `onMessageUpdate`, `onCommanderActivity`). Essas são funções inline em `WhatsAppInbox.tsx` — recriadas a cada render. Resultado: a subscription Realtime é destruída e recriada continuamente, nunca ficando estável o suficiente para receber sinais.

### 2. Realtime bloqueado sem RLS
A tabela `whatsapp_sync_signals` não tem policy de `SELECT` para usuários autenticados. O Supabase Realtime exige `SELECT` permission para enviar `postgres_changes` ao frontend. Sem a policy, nenhum evento chega.

### 3. Canal com nome fixo = conflito
Múltiplos componentes (`WhatsAppInbox`, `WhatsAppAllConversations`, `WhatsAppKanban`, `WhatsAppLabelConversations`) usam o mesmo canal `'whatsapp-sync-signals'`. O Supabase reutiliza/conflita canais com o mesmo nome.

## Solução

### Fix 1 — RLS Policy (migração SQL)
```sql
CREATE POLICY "Authenticated users can read sync signals for their tenant"
ON public.whatsapp_sync_signals
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
);
```

### Fix 2 — Hook: guardar callbacks em refs
Substituir o array de dependências para usar `useRef` nas callbacks, evitando recriação da subscription:

```ts
// Em vez de passar callbacks no useEffect deps:
const onConversationUpdateRef = useRef(onConversationUpdate);
const onMessageUpdateRef = useRef(onMessageUpdate);
// etc.

useEffect(() => {
  onConversationUpdateRef.current = onConversationUpdate;
  onMessageUpdateRef.current = onMessageUpdate;
  // etc.
}); // sem deps — sempre sincroniza

useEffect(() => {
  // subscription estável — sem callbacks no array de deps
}, [tenantId, enabled]); // deps mínimas
```

### Fix 3 — Canal único por tenant
Usar nome de canal único com tenant: `'whatsapp-sync-' + tenantId` para evitar conflitos entre múltiplas instâncias do hook.

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar RLS `SELECT` policy na tabela `whatsapp_sync_signals` |
| `src/hooks/useWhatsAppSync.ts` | Usar refs para callbacks, canal único por tenant |
