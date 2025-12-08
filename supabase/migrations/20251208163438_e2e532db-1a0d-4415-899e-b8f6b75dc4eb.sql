
-- =============================================
-- Continue RLS Updates for remaining tables
-- =============================================

-- PROCESSOS table
DROP POLICY IF EXISTS "Admins can manage all processos" ON public.processos;
DROP POLICY IF EXISTS "Users can view own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can create own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can update own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can delete own processos" ON public.processos;

CREATE POLICY "Tenant admins can manage all processos"
ON public.processos FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can view own tenant processos"
ON public.processos FOR SELECT
USING (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can create own tenant processos"
ON public.processos FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can update own tenant processos"
ON public.processos FOR UPDATE
USING (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can delete own tenant processos"
ON public.processos FOR DELETE
USING (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

-- PROCESSOS_OAB table
DROP POLICY IF EXISTS "Users can view own processos_oab" ON public.processos_oab;
DROP POLICY IF EXISTS "Users can manage own processos_oab" ON public.processos_oab;

CREATE POLICY "Users can view own tenant processos_oab"
ON public.processos_oab FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM oabs_cadastradas oc
    WHERE oc.id = processos_oab.oab_id
    AND oc.user_id = auth.uid()
  )
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can manage own tenant processos_oab"
ON public.processos_oab FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM oabs_cadastradas oc
    WHERE oc.id = processos_oab.oab_id
    AND oc.user_id = auth.uid()
  )
  AND tenant_id = get_user_tenant_id()
);

-- REUNIOES table
DROP POLICY IF EXISTS "Admins can manage all reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can view own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can create own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can update own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can delete own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda role can view all reunioes" ON public.reunioes;

CREATE POLICY "Tenant admins can manage all reunioes"
ON public.reunioes FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Tenant agenda can view all reunioes"
ON public.reunioes FOR SELECT
USING (
  has_role(auth.uid(), 'agenda'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can view own tenant reunioes"
ON public.reunioes FOR SELECT
USING (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can create own tenant reunioes"
ON public.reunioes FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can update own tenant reunioes"
ON public.reunioes FOR UPDATE
USING (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can delete own tenant reunioes"
ON public.reunioes FOR DELETE
USING (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

-- REUNIAO_CLIENTES table
DROP POLICY IF EXISTS "Admins can manage all reuniao_clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can view own reuniao_clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can manage own reuniao_clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda role can view all reuniao_clientes" ON public.reuniao_clientes;

CREATE POLICY "Tenant admins can manage all reuniao_clientes"
ON public.reuniao_clientes FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Tenant agenda can view all reuniao_clientes"
ON public.reuniao_clientes FOR SELECT
USING (
  has_role(auth.uid(), 'agenda'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can view own tenant reuniao_clientes"
ON public.reuniao_clientes FOR SELECT
USING (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can manage own tenant reuniao_clientes"
ON public.reuniao_clientes FOR ALL
USING (
  auth.uid() = created_by 
  AND tenant_id = get_user_tenant_id()
);

-- NOTIFICATIONS table
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can view own tenant notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Users can update own tenant notifications"
ON public.notifications FOR UPDATE
USING (
  auth.uid() = user_id 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "System can create tenant notifications"
ON public.notifications FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());
