-- Correção de policies - usar DROP IF EXISTS para todas

-- USER_ROLES - corrigir duplicata
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles in tenant" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage tenant roles" ON user_roles;

CREATE POLICY "Admins can manage tenant roles" ON user_roles
  FOR ALL USING (is_admin_in_same_tenant(user_id));
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view roles in tenant" ON user_roles
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Tabelas auxiliares restantes com tenant_id

-- CLIENTE_DIVIDAS
DROP POLICY IF EXISTS "Admins can view all dividas" ON cliente_dividas;
DROP POLICY IF EXISTS "Admins can create cliente dividas" ON cliente_dividas;
DROP POLICY IF EXISTS "Admins can update cliente dividas" ON cliente_dividas;
DROP POLICY IF EXISTS "Admins can delete cliente dividas" ON cliente_dividas;
DROP POLICY IF EXISTS "Users can view dividas of their clients" ON cliente_dividas;
DROP POLICY IF EXISTS "Users can create dividas for their clients" ON cliente_dividas;
DROP POLICY IF EXISTS "Users can update dividas of their clients" ON cliente_dividas;
DROP POLICY IF EXISTS "Users can delete dividas of their clients" ON cliente_dividas;

CREATE POLICY "Admins can view tenant dividas" ON cliente_dividas
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can create tenant dividas" ON cliente_dividas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can update tenant dividas" ON cliente_dividas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete tenant dividas" ON cliente_dividas
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view dividas in tenant" ON cliente_dividas
  FOR SELECT USING (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_dividas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create dividas in tenant" ON cliente_dividas
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_dividas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update dividas in tenant" ON cliente_dividas
  FOR UPDATE USING (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_dividas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can delete dividas in tenant" ON cliente_dividas
  FOR DELETE USING (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_dividas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());

-- CLIENTE_PARCELAS
DROP POLICY IF EXISTS "Admins can view all parcelas" ON cliente_parcelas;
DROP POLICY IF EXISTS "Admins can manage all parcelas" ON cliente_parcelas;
DROP POLICY IF EXISTS "Users can view parcelas of their clients" ON cliente_parcelas;
DROP POLICY IF EXISTS "Users can create parcelas for their clients" ON cliente_parcelas;
DROP POLICY IF EXISTS "Users can update parcelas of their clients" ON cliente_parcelas;

CREATE POLICY "Admins can manage tenant parcelas" ON cliente_parcelas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view parcelas in tenant" ON cliente_parcelas
  FOR SELECT USING (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_parcelas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create parcelas in tenant" ON cliente_parcelas
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_parcelas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update parcelas in tenant" ON cliente_parcelas
  FOR UPDATE USING (EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_parcelas.cliente_id AND c.user_id = auth.uid()) AND tenant_id = get_user_tenant_id());

-- ETIQUETAS, GRUPOS_ACOES, COMARCAS, TRIBUNAIS
DROP POLICY IF EXISTS "Admins can manage all etiquetas" ON etiquetas;
DROP POLICY IF EXISTS "Users can view their own etiquetas" ON etiquetas;
DROP POLICY IF EXISTS "Users can create their own etiquetas" ON etiquetas;
CREATE POLICY "Admins can manage tenant etiquetas" ON etiquetas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view etiquetas in tenant" ON etiquetas FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create etiquetas in tenant" ON etiquetas FOR INSERT WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage all grupos acoes" ON grupos_acoes;
DROP POLICY IF EXISTS "Everyone can view grupos_acoes" ON grupos_acoes;
DROP POLICY IF EXISTS "Authenticated users can create grupos_acoes" ON grupos_acoes;
CREATE POLICY "Admins can manage tenant grupos acoes" ON grupos_acoes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view grupos acoes in tenant" ON grupos_acoes FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create grupos acoes in tenant" ON grupos_acoes FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage all comarcas" ON comarcas;
DROP POLICY IF EXISTS "Everyone can view comarcas" ON comarcas;
DROP POLICY IF EXISTS "Authenticated users can create comarcas" ON comarcas;
CREATE POLICY "Admins can manage tenant comarcas" ON comarcas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view comarcas in tenant" ON comarcas FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create comarcas in tenant" ON comarcas FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage all tribunais" ON tribunais;
DROP POLICY IF EXISTS "Everyone can view tribunais" ON tribunais;
DROP POLICY IF EXISTS "Authenticated users can create tribunais" ON tribunais;
CREATE POLICY "Admins can manage tenant tribunais" ON tribunais FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view tribunais in tenant" ON tribunais FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can create tribunais in tenant" ON tribunais FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());