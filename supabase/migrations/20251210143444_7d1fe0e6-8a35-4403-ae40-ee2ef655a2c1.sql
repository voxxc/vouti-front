-- =====================================================
-- LIMPEZA TOTAL DE RLS - 8 TABELAS (OAB + REUNIÃO)
-- Remove 106 políticas e recria apenas 32 padronizadas
-- =====================================================

-- Fase 1: Remover TODAS as políticas existentes das 8 tabelas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'oabs_cadastradas', 
      'processos_oab', 
      'processos_oab_andamentos', 
      'processos_oab_tarefas',
      'reunioes', 
      'reuniao_clientes', 
      'reuniao_comentarios', 
      'reuniao_arquivos'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- =====================================================
-- Fase 2: Recriar políticas MÍNIMAS para cada tabela
-- =====================================================

-- ========== oabs_cadastradas ==========
CREATE POLICY "tenant_select" ON public.oabs_cadastradas
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.oabs_cadastradas
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.oabs_cadastradas
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.oabs_cadastradas
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== processos_oab ==========
CREATE POLICY "tenant_select" ON public.processos_oab
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.processos_oab
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.processos_oab
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.processos_oab
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== processos_oab_andamentos ==========
CREATE POLICY "tenant_select" ON public.processos_oab_andamentos
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.processos_oab_andamentos
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.processos_oab_andamentos
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.processos_oab_andamentos
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== processos_oab_tarefas ==========
CREATE POLICY "tenant_select" ON public.processos_oab_tarefas
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.processos_oab_tarefas
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.processos_oab_tarefas
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.processos_oab_tarefas
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== reunioes ==========
CREATE POLICY "tenant_select" ON public.reunioes
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.reunioes
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.reunioes
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.reunioes
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== reuniao_clientes ==========
CREATE POLICY "tenant_select" ON public.reuniao_clientes
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.reuniao_clientes
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.reuniao_clientes
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.reuniao_clientes
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== reuniao_comentarios ==========
CREATE POLICY "tenant_select" ON public.reuniao_comentarios
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.reuniao_comentarios
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.reuniao_comentarios
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.reuniao_comentarios
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ========== reuniao_arquivos ==========
CREATE POLICY "tenant_select" ON public.reuniao_arquivos
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.reuniao_arquivos
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update" ON public.reuniao_arquivos
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.reuniao_arquivos
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());