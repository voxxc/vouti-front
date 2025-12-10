-- =====================================================
-- CORREÇÃO CRÍTICA: Isolamento Multi-Tenant para Reuniões
-- Dropar TODAS as policies existentes e recriar do zero
-- =====================================================

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reunioes
-- =====================================================
DROP POLICY IF EXISTS "Users can view own tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can create own tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can update own tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can delete own tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Admins can manage tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda can view tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda can create tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda can update tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda can delete tenant reunioes" ON public.reunioes;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_clientes
-- =====================================================
DROP POLICY IF EXISTS "Users can view own tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can create own tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can update own tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can delete own tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Admins can manage tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda can view tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda can create tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda can update tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda can delete tenant reuniao clientes" ON public.reuniao_clientes;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_status
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant reuniao status" ON public.reuniao_status;
DROP POLICY IF EXISTS "Agenda can manage tenant reuniao status" ON public.reuniao_status;
DROP POLICY IF EXISTS "Users can view tenant reuniao status" ON public.reuniao_status;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_comentarios
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Agenda can view tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Agenda can create tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can create tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can view tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can update own reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can delete own reuniao comentarios" ON public.reuniao_comentarios;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_arquivos
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Agenda can view tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can view tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can upload tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can delete own reuniao arquivos" ON public.reuniao_arquivos;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_cliente_arquivos
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant reuniao cliente arquivos" ON public.reuniao_cliente_arquivos;
DROP POLICY IF EXISTS "Agenda can view tenant reuniao cliente arquivos" ON public.reuniao_cliente_arquivos;
DROP POLICY IF EXISTS "Users can view tenant reuniao cliente arquivos" ON public.reuniao_cliente_arquivos;
DROP POLICY IF EXISTS "Users can upload tenant reuniao cliente arquivos" ON public.reuniao_cliente_arquivos;
DROP POLICY IF EXISTS "Users can delete own reuniao cliente arquivos" ON public.reuniao_cliente_arquivos;

-- =====================================================
-- DROPAR TODAS AS POLICIES DE reuniao_cliente_comentarios
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage tenant reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;
DROP POLICY IF EXISTS "Agenda can view tenant reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;
DROP POLICY IF EXISTS "Users can view tenant reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;
DROP POLICY IF EXISTS "Users can create tenant reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;
DROP POLICY IF EXISTS "Users can update own reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;
DROP POLICY IF EXISTS "Users can delete own reuniao cliente comentarios" ON public.reuniao_cliente_comentarios;

-- =====================================================
-- RECRIAR POLÍTICAS - reunioes
-- =====================================================
CREATE POLICY "Admins can manage tenant reunioes"
ON public.reunioes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reunioes"
ON public.reunioes FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can create tenant reunioes"
ON public.reunioes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can update tenant reunioes"
ON public.reunioes FOR UPDATE
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can delete tenant reunioes"
ON public.reunioes FOR DELETE
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view own tenant reunioes"
ON public.reunioes FOR SELECT
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create own tenant reunioes"
ON public.reunioes FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own tenant reunioes"
ON public.reunioes FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own tenant reunioes"
ON public.reunioes FOR DELETE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_clientes
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao clientes"
ON public.reuniao_clientes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reuniao clientes"
ON public.reuniao_clientes FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can create tenant reuniao clientes"
ON public.reuniao_clientes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can update tenant reuniao clientes"
ON public.reuniao_clientes FOR UPDATE
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can delete tenant reuniao clientes"
ON public.reuniao_clientes FOR DELETE
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view own tenant reuniao clientes"
ON public.reuniao_clientes FOR SELECT
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create own tenant reuniao clientes"
ON public.reuniao_clientes FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own tenant reuniao clientes"
ON public.reuniao_clientes FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own tenant reuniao clientes"
ON public.reuniao_clientes FOR DELETE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_status
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao status"
ON public.reuniao_status FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can manage tenant reuniao status"
ON public.reuniao_status FOR ALL
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant reuniao status"
ON public.reuniao_status FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_comentarios
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao comentarios"
ON public.reuniao_comentarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reuniao comentarios"
ON public.reuniao_comentarios FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can create tenant reuniao comentarios"
ON public.reuniao_comentarios FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tenant reuniao comentarios"
ON public.reuniao_comentarios FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant reuniao comentarios"
ON public.reuniao_comentarios FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own reuniao comentarios"
ON public.reuniao_comentarios FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own reuniao comentarios"
ON public.reuniao_comentarios FOR DELETE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_arquivos
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao arquivos"
ON public.reuniao_arquivos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reuniao arquivos"
ON public.reuniao_arquivos FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant reuniao arquivos"
ON public.reuniao_arquivos FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can upload tenant reuniao arquivos"
ON public.reuniao_arquivos FOR INSERT
WITH CHECK (auth.uid() = uploaded_by AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own reuniao arquivos"
ON public.reuniao_arquivos FOR DELETE
USING (auth.uid() = uploaded_by AND tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_cliente_arquivos
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao cliente arquivos"
ON public.reuniao_cliente_arquivos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reuniao cliente arquivos"
ON public.reuniao_cliente_arquivos FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant reuniao cliente arquivos"
ON public.reuniao_cliente_arquivos FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can upload tenant reuniao cliente arquivos"
ON public.reuniao_cliente_arquivos FOR INSERT
WITH CHECK (auth.uid() = uploaded_by AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own reuniao cliente arquivos"
ON public.reuniao_cliente_arquivos FOR DELETE
USING (auth.uid() = uploaded_by AND tenant_id = get_user_tenant_id());

-- =====================================================
-- RECRIAR POLÍTICAS - reuniao_cliente_comentarios
-- =====================================================
CREATE POLICY "Admins can manage tenant reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Agenda can view tenant reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR SELECT
USING (has_role(auth.uid(), 'agenda'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view tenant reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tenant reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own reuniao cliente comentarios"
ON public.reuniao_cliente_comentarios FOR DELETE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());