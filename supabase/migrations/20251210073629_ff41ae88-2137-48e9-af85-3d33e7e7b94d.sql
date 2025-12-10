-- =====================================================
-- FASE 1: LIMPAR TODAS AS POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Dropar TODAS as políticas de reunioes
DROP POLICY IF EXISTS "Users can manage their own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can view tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can create tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can update tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can delete tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Admins can manage tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Agenda users can manage tenant reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can view their own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can create their own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can update their own reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "Users can delete their own reunioes" ON public.reunioes;

-- Dropar TODAS as políticas de reuniao_clientes
DROP POLICY IF EXISTS "Users can view their own reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can view own tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can view tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can create tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can update tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can delete tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Admins can manage tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Agenda users can manage tenant reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can create their own reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can update their own reuniao clientes" ON public.reuniao_clientes;
DROP POLICY IF EXISTS "Users can delete their own reuniao clientes" ON public.reuniao_clientes;

-- Dropar TODAS as políticas de reuniao_comentarios
DROP POLICY IF EXISTS "Users can view tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can create tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can delete own reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can update own reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Admins can manage tenant reuniao comentarios" ON public.reuniao_comentarios;

-- Dropar TODAS as políticas de reuniao_arquivos
DROP POLICY IF EXISTS "Users can view tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can create tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can delete tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Admins can manage tenant reuniao arquivos" ON public.reuniao_arquivos;

-- =====================================================
-- FASE 2: MIGRAR DADOS ÓRFÃOS PARA SOLVENZA
-- =====================================================

UPDATE public.reunioes 
SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4'
WHERE tenant_id IS NULL;

UPDATE public.reuniao_clientes 
SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4'
WHERE tenant_id IS NULL;

UPDATE public.reuniao_comentarios 
SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4'
WHERE tenant_id IS NULL;

UPDATE public.reuniao_arquivos 
SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4'
WHERE tenant_id IS NULL;

-- =====================================================
-- FASE 3: RECRIAR POLÍTICAS RLS LIMPAS E CONSISTENTES
-- =====================================================

-- Garantir RLS está habilitado
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuniao_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuniao_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reuniao_arquivos ENABLE ROW LEVEL SECURITY;

-- ===================
-- POLÍTICAS: reunioes
-- ===================

CREATE POLICY "tenant_reunioes_select"
ON public.reunioes FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reunioes_insert"
ON public.reunioes FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reunioes_update"
ON public.reunioes FOR UPDATE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reunioes_delete"
ON public.reunioes FOR DELETE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ==========================
-- POLÍTICAS: reuniao_clientes
-- ==========================

CREATE POLICY "tenant_reuniao_clientes_select"
ON public.reuniao_clientes FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_clientes_insert"
ON public.reuniao_clientes FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_clientes_update"
ON public.reuniao_clientes FOR UPDATE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_clientes_delete"
ON public.reuniao_clientes FOR DELETE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- =============================
-- POLÍTICAS: reuniao_comentarios
-- =============================

CREATE POLICY "tenant_reuniao_comentarios_select"
ON public.reuniao_comentarios FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_comentarios_insert"
ON public.reuniao_comentarios FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id() AND auth.uid() = user_id);

CREATE POLICY "tenant_reuniao_comentarios_update"
ON public.reuniao_comentarios FOR UPDATE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id() AND auth.uid() = user_id);

CREATE POLICY "tenant_reuniao_comentarios_delete"
ON public.reuniao_comentarios FOR DELETE
USING (auth.uid() = user_id);

-- ==========================
-- POLÍTICAS: reuniao_arquivos
-- ==========================

CREATE POLICY "tenant_reuniao_arquivos_select"
ON public.reuniao_arquivos FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_arquivos_insert"
ON public.reuniao_arquivos FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_reuniao_arquivos_delete"
ON public.reuniao_arquivos FOR DELETE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());