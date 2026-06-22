
-- 1) Novas colunas em credenciais_cliente
ALTER TABLE public.credenciais_cliente
  ADD COLUMN IF NOT EXISTS customer_key text,
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_credenciais_cliente_customer_key
  ON public.credenciais_cliente(customer_key);

-- 2) Estender constraint de status em credenciais_judit
ALTER TABLE public.credenciais_judit
  DROP CONSTRAINT IF EXISTS credenciais_judit_status_check;

ALTER TABLE public.credenciais_judit
  ADD CONSTRAINT credenciais_judit_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'error'::text, 'removed'::text, 'pendente_reenvio'::text]));

-- 3) Auditoria de revelação de senhas
CREATE TABLE IF NOT EXISTS public.credenciais_reveal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_cliente_id uuid REFERENCES public.credenciais_cliente(id) ON DELETE SET NULL,
  super_admin_id uuid NOT NULL REFERENCES auth.users(id),
  motivo text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credenciais_reveal_audit TO authenticated;
GRANT ALL ON public.credenciais_reveal_audit TO service_role;

ALTER TABLE public.credenciais_reveal_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-admins podem ler auditoria de revelações"
  ON public.credenciais_reveal_audit
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()));

CREATE POLICY "Super-admins podem inserir auditoria de revelações"
  ON public.credenciais_reveal_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    super_admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_credenciais_reveal_audit_credencial
  ON public.credenciais_reveal_audit(credencial_cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credenciais_reveal_audit_super_admin
  ON public.credenciais_reveal_audit(super_admin_id, created_at DESC);
