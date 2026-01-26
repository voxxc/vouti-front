-- Verificar e criar tabela se não existe
CREATE TABLE IF NOT EXISTS public.comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_type TEXT NOT NULL,
    comment_id UUID NOT NULL,
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    tenant_id UUID REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(comment_type, comment_id, mentioned_user_id)
);

-- RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Remover policies existentes antes de criar novas
DROP POLICY IF EXISTS "tenant_select" ON public.comment_mentions;
DROP POLICY IF EXISTS "tenant_insert" ON public.comment_mentions;
DROP POLICY IF EXISTS "tenant_delete" ON public.comment_mentions;

CREATE POLICY "tenant_select" ON public.comment_mentions
FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.comment_mentions
FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.comment_mentions
FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Indices com IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_comment_mentions_type_id ON public.comment_mentions(comment_type, comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_tenant ON public.comment_mentions(tenant_id);