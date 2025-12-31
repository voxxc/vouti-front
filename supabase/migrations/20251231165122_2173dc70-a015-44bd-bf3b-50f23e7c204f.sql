-- Adicionar RLS policies para role 'financeiro' ver e gerenciar dados financeiros

-- Policy para financeiro ver clientes do tenant
CREATE POLICY "Financeiro can view tenant clients"
ON clientes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Policy para financeiro ver parcelas do tenant
CREATE POLICY "Financeiro can view tenant parcelas"
ON cliente_parcelas FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Policy para financeiro atualizar parcelas (baixa de pagamento)
CREATE POLICY "Financeiro can update tenant parcelas"
ON cliente_parcelas FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Policy para financeiro ver dívidas do tenant
CREATE POLICY "Financeiro can view tenant dividas"
ON cliente_dividas FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Policy para financeiro ver comentários de pagamento do tenant
CREATE POLICY "Financeiro can view tenant pagamento comentarios"
ON cliente_pagamento_comentarios FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Policy para financeiro criar comentários de pagamento
CREATE POLICY "Financeiro can create pagamento comentarios"
ON cliente_pagamento_comentarios FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) 
  AND tenant_id = get_user_tenant_id()
  AND auth.uid() = user_id
);