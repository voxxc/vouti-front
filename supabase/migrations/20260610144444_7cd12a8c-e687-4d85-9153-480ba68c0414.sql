
-- Tabela de histórico de edições de prazos
CREATE TABLE public.deadline_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id uuid NOT NULL REFERENCES public.deadlines(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  alterado_por uuid,
  alterado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.deadline_historico TO authenticated;
GRANT ALL ON public.deadline_historico TO service_role;

ALTER TABLE public.deadline_historico ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários do mesmo tenant que tenham acesso ao prazo (mesma regra das deadlines via tenant)
CREATE POLICY "Tenant members can view deadline history"
ON public.deadline_historico
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- INSERT permitido só via trigger (service role) — mas permite insert via trigger executando em contexto do usuário
CREATE POLICY "System can insert deadline history"
ON public.deadline_historico
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_deadline_historico_deadline ON public.deadline_historico (deadline_id, alterado_em DESC);
CREATE INDEX idx_deadline_historico_tenant ON public.deadline_historico (tenant_id);

-- Função que registra alterações
CREATE OR REPLACE FUNCTION public.registrar_deadline_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  BEGIN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'title', OLD.title, NEW.title, v_user);
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'description', OLD.description, NEW.description, v_user);
    END IF;

    IF OLD.date IS DISTINCT FROM NEW.date THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'date', OLD.date::text, NEW.date::text, v_user);
    END IF;

    IF OLD.advogado_responsavel_id IS DISTINCT FROM NEW.advogado_responsavel_id THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'advogado_responsavel_id', OLD.advogado_responsavel_id::text, NEW.advogado_responsavel_id::text, v_user);
    END IF;

    IF OLD.deadline_category IS DISTINCT FROM NEW.deadline_category THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'deadline_category', OLD.deadline_category, NEW.deadline_category, v_user);
    END IF;

    IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
      INSERT INTO public.deadline_historico (deadline_id, tenant_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
      VALUES (NEW.id, NEW.tenant_id, 'project_id', OLD.project_id::text, NEW.project_id::text, v_user);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- nunca bloquear o update original
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deadlines_historico_trigger
AFTER UPDATE ON public.deadlines
FOR EACH ROW
EXECUTE FUNCTION public.registrar_deadline_historico();
