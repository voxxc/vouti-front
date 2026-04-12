CREATE TABLE public.auditoria_andamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id uuid REFERENCES public.processos_oab(id) ON DELETE SET NULL,
  numero_cnj text,
  tenant_id uuid,
  tenant_nome text,
  problema text,
  acao_tomada text,
  andamentos_antes integer DEFAULT 0,
  andamentos_depois integer DEFAULT 0,
  andamentos_inseridos integer DEFAULT 0,
  sucesso boolean DEFAULT false,
  erro_mensagem text,
  executado_em timestamptz DEFAULT now(),
  executado_por uuid
);

ALTER TABLE public.auditoria_andamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver auditoria"
  ON public.auditoria_andamentos FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem inserir auditoria"
  ON public.auditoria_andamentos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX idx_auditoria_andamentos_tenant ON public.auditoria_andamentos(tenant_id);
CREATE INDEX idx_auditoria_andamentos_problema ON public.auditoria_andamentos(problema);
CREATE INDEX idx_auditoria_andamentos_executado_em ON public.auditoria_andamentos(executado_em DESC);