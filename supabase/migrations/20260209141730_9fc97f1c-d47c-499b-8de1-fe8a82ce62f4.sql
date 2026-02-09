
-- Remove a constraint antiga que não funciona com NULL
ALTER TABLE public.whatsapp_ai_pending_responses DROP CONSTRAINT IF EXISTS unique_pending_phone_tenant;

-- Limpar duplicados (manter apenas o mais recente por phone onde tenant_id IS NULL)
DELETE FROM public.whatsapp_ai_pending_responses a
USING public.whatsapp_ai_pending_responses b
WHERE a.phone = b.phone
  AND a.tenant_id IS NULL
  AND b.tenant_id IS NULL
  AND a.scheduled_at < b.scheduled_at;

-- Limpar duplicados para tenant_id NOT NULL
DELETE FROM public.whatsapp_ai_pending_responses a
USING public.whatsapp_ai_pending_responses b
WHERE a.phone = b.phone
  AND a.tenant_id = b.tenant_id
  AND a.scheduled_at < b.scheduled_at;

-- Índice parcial para tenant_id NULL
CREATE UNIQUE INDEX unique_pending_phone_null_tenant
ON public.whatsapp_ai_pending_responses (phone)
WHERE tenant_id IS NULL;

-- Índice parcial para tenant_id NOT NULL
CREATE UNIQUE INDEX unique_pending_phone_with_tenant
ON public.whatsapp_ai_pending_responses (phone, tenant_id)
WHERE tenant_id IS NOT NULL;
