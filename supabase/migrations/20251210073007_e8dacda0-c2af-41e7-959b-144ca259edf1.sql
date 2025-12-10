-- Remover políticas existentes de reuniao_comentarios
DROP POLICY IF EXISTS "Users can view tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can create tenant reuniao comentarios" ON public.reuniao_comentarios;
DROP POLICY IF EXISTS "Users can delete own reuniao comentarios" ON public.reuniao_comentarios;

-- Remover políticas existentes de reuniao_arquivos
DROP POLICY IF EXISTS "Users can view tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can create tenant reuniao arquivos" ON public.reuniao_arquivos;
DROP POLICY IF EXISTS "Users can delete tenant reuniao arquivos" ON public.reuniao_arquivos;

-- Recriar políticas para reuniao_comentarios
CREATE POLICY "Users can view tenant reuniao comentarios"
ON public.reuniao_comentarios FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tenant reuniao comentarios"
ON public.reuniao_comentarios FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id() AND auth.uid() = user_id);

CREATE POLICY "Users can delete own reuniao comentarios"
ON public.reuniao_comentarios FOR DELETE
USING (auth.uid() = user_id);

-- Recriar políticas para reuniao_arquivos
CREATE POLICY "Users can view tenant reuniao arquivos"
ON public.reuniao_arquivos FOR SELECT
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tenant reuniao arquivos"
ON public.reuniao_arquivos FOR INSERT
WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete tenant reuniao arquivos"
ON public.reuniao_arquivos FOR DELETE
USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());