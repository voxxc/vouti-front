-- =====================================================
-- FASE 1: Adicionar tenant_id às tabelas que não têm
-- =====================================================

-- projudi_credentials
ALTER TABLE IF EXISTS public.projudi_credentials
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- task_history
ALTER TABLE IF EXISTS public.task_history
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- tribunal_credentials
ALTER TABLE IF EXISTS public.tribunal_credentials
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- whatsapp_automations
ALTER TABLE IF EXISTS public.whatsapp_automations
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- whatsapp_instances
ALTER TABLE IF EXISTS public.whatsapp_instances
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- whatsapp_messages
ALTER TABLE IF EXISTS public.whatsapp_messages
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- =====================================================
-- FASE 2: Migrar dados órfãos - Atribuir tenant_id
-- =====================================================

-- Atribuir tenant_id para task_history baseado na task
UPDATE public.task_history th
SET tenant_id = t.tenant_id
FROM public.tasks t
WHERE th.task_id = t.id
AND th.tenant_id IS NULL
AND t.tenant_id IS NOT NULL;

-- Atribuir tenant_id para reuniao_arquivos baseado na reuniao
UPDATE public.reuniao_arquivos ra
SET tenant_id = r.tenant_id
FROM public.reunioes r
WHERE ra.reuniao_id = r.id
AND ra.tenant_id IS NULL
AND r.tenant_id IS NOT NULL;

-- Atribuir tenant_id para reuniao_comentarios baseado na reuniao
UPDATE public.reuniao_comentarios rc
SET tenant_id = r.tenant_id
FROM public.reunioes r
WHERE rc.reuniao_id = r.id
AND rc.tenant_id IS NULL
AND r.tenant_id IS NOT NULL;

-- Atribuir tenant_id para reuniao_cliente_comentarios baseado no cliente
UPDATE public.reuniao_cliente_comentarios rcc
SET tenant_id = rc.tenant_id
FROM public.reuniao_clientes rc
WHERE rcc.cliente_id = rc.id
AND rcc.tenant_id IS NULL
AND rc.tenant_id IS NOT NULL;

-- Atribuir tenant_id para reuniao_cliente_arquivos baseado no cliente
UPDATE public.reuniao_cliente_arquivos rca
SET tenant_id = rc.tenant_id
FROM public.reuniao_clientes rc
WHERE rca.cliente_id = rc.id
AND rca.tenant_id IS NULL
AND rc.tenant_id IS NOT NULL;

-- Atribuir tenant_id para deadline_comentarios baseado no deadline
UPDATE public.deadline_comentarios dc
SET tenant_id = d.tenant_id
FROM public.deadlines d
WHERE dc.deadline_id = d.id
AND dc.tenant_id IS NULL
AND d.tenant_id IS NOT NULL;

-- Atribuir tenant_id para cliente_pagamento_comentarios baseado na parcela
UPDATE public.cliente_pagamento_comentarios cpc
SET tenant_id = cp.tenant_id
FROM public.cliente_parcelas cp
WHERE cpc.parcela_id = cp.id
AND cpc.tenant_id IS NULL
AND cp.tenant_id IS NOT NULL;

-- =====================================================
-- FASE 3: Fortalecer RLS policies para clientes
-- =====================================================

-- Drop existing weak policies and recreate with tenant check
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clientes;

-- Recreate with tenant_id verification
CREATE POLICY "Users can view their own clients in tenant"
ON public.clientes FOR SELECT
USING (
  auth.uid() = user_id 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can create their own clients in tenant"
ON public.clientes FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can update their own clients in tenant"
ON public.clientes FOR UPDATE
USING (
  auth.uid() = user_id 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can delete their own clients in tenant"
ON public.clientes FOR DELETE
USING (
  auth.uid() = user_id 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

-- =====================================================
-- FASE 4: Fortalecer RLS policies para tasks
-- =====================================================

-- Drop existing weak policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks;

-- Recreate with tenant_id verification
CREATE POLICY "tenant_tasks_select"
ON public.tasks FOR SELECT
USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "tenant_tasks_insert"
ON public.tasks FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id()
);

CREATE POLICY "tenant_tasks_update"
ON public.tasks FOR UPDATE
USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "tenant_tasks_delete"
ON public.tasks FOR DELETE
USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

-- =====================================================
-- FASE 5: Fortalecer RLS policies para deadlines
-- =====================================================

-- Drop existing weak policies
DROP POLICY IF EXISTS "Users can view their deadlines and tagged deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can create their own deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can update their own deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "Users can delete their own deadlines" ON public.deadlines;

-- Recreate with tenant_id verification
CREATE POLICY "Users can view deadlines in tenant"
ON public.deadlines FOR SELECT
USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
  AND (
    auth.uid() = user_id 
    OR auth.uid() = advogado_responsavel_id 
    OR is_tagged_in_deadline(id, auth.uid())
  )
);

CREATE POLICY "Users can create deadlines in tenant"
ON public.deadlines FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can update their deadlines in tenant"
ON public.deadlines FOR UPDATE
USING (
  auth.uid() = user_id 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can delete their deadlines in tenant"
ON public.deadlines FOR DELETE
USING (
  auth.uid() = user_id 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);

-- =====================================================
-- FASE 6: Adicionar índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_task_history_tenant_id ON public.task_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projudi_credentials_tenant_id ON public.projudi_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tribunal_credentials_tenant_id ON public.tribunal_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_automations_tenant_id ON public.whatsapp_automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant_id ON public.whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON public.whatsapp_messages(tenant_id);