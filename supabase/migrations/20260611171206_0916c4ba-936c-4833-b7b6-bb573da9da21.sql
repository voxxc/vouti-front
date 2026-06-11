
-- =========================================================
-- AUDIÊNCIAS: tabelas, RLS, triggers e RPC de sync
-- =========================================================

-- 1) Tabela principal -------------------------------------------------
CREATE TABLE public.audiencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  processo_oab_id uuid NOT NULL REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  andamento_origem_id uuid REFERENCES public.processos_oab_andamentos(id) ON DELETE SET NULL,
  data_audiencia timestamptz NOT NULL,
  hora_conhecida boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'Outras',
  modalidade text,
  local text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmada','realizada','cancelada','adiada')),
  observacoes text,
  descricao_origem text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (processo_oab_id, data_audiencia)
);
CREATE INDEX idx_audiencias_tenant_data ON public.audiencias(tenant_id, data_audiencia);
CREATE INDEX idx_audiencias_processo ON public.audiencias(processo_oab_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audiencias TO authenticated;
GRANT ALL ON public.audiencias TO service_role;
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audiencias_tenant_select" ON public.audiencias
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "audiencias_tenant_write" ON public.audiencias
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 2) Responsáveis -----------------------------------------------------
CREATE TABLE public.audiencia_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id uuid NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  papel text NOT NULL DEFAULT 'titular' CHECK (papel IN ('titular','suporte')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (audiencia_id, user_id)
);
CREATE INDEX idx_aud_resp_audiencia ON public.audiencia_responsaveis(audiencia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audiencia_responsaveis TO authenticated;
GRANT ALL ON public.audiencia_responsaveis TO service_role;
ALTER TABLE public.audiencia_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aud_resp_tenant_select" ON public.audiencia_responsaveis
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "aud_resp_tenant_write" ON public.audiencia_responsaveis
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 3) Comentários ------------------------------------------------------
CREATE TABLE public.audiencia_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id uuid NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comentario text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aud_coment_audiencia ON public.audiencia_comentarios(audiencia_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audiencia_comentarios TO authenticated;
GRANT ALL ON public.audiencia_comentarios TO service_role;
ALTER TABLE public.audiencia_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aud_coment_tenant_select" ON public.audiencia_comentarios
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "aud_coment_tenant_insert" ON public.audiencia_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());
CREATE POLICY "aud_coment_owner_update" ON public.audiencia_comentarios
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid())
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());
CREATE POLICY "aud_coment_owner_delete" ON public.audiencia_comentarios
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND user_id = auth.uid());

-- 4) Histórico --------------------------------------------------------
CREATE TABLE public.audiencia_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id uuid NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  user_id uuid,
  acao text NOT NULL,
  de jsonb,
  para jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aud_hist_audiencia ON public.audiencia_historico(audiencia_id, created_at DESC);

GRANT SELECT, INSERT ON public.audiencia_historico TO authenticated;
GRANT ALL ON public.audiencia_historico TO service_role;
ALTER TABLE public.audiencia_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aud_hist_tenant_select" ON public.audiencia_historico
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "aud_hist_tenant_insert" ON public.audiencia_historico
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 5) Trigger updated_at ----------------------------------------------
CREATE OR REPLACE FUNCTION public.set_audiencias_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_audiencias_updated
  BEFORE UPDATE ON public.audiencias
  FOR EACH ROW EXECUTE FUNCTION public.set_audiencias_updated_at();

CREATE TRIGGER trg_aud_coment_updated
  BEFORE UPDATE ON public.audiencia_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.set_audiencias_updated_at();

-- 6) Triggers de auditoria -------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_audiencia_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, para)
    VALUES (NEW.id, NEW.tenant_id, NEW.criado_por,
      'criada',
      jsonb_build_object('status', NEW.status, 'data_audiencia', NEW.data_audiencia,
                         'tipo', NEW.tipo, 'modalidade', NEW.modalidade, 'local', NEW.local));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, de, para)
      VALUES (NEW.id, NEW.tenant_id, auth.uid(),
        'status_alterado',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status));
    END IF;
    IF NEW.data_audiencia IS DISTINCT FROM OLD.data_audiencia
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.modalidade IS DISTINCT FROM OLD.modalidade
       OR NEW.local IS DISTINCT FROM OLD.local
       OR COALESCE(NEW.observacoes,'') IS DISTINCT FROM COALESCE(OLD.observacoes,'') THEN
      INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, de, para)
      VALUES (NEW.id, NEW.tenant_id, auth.uid(),
        'dados_alterados',
        jsonb_build_object('data_audiencia', OLD.data_audiencia, 'tipo', OLD.tipo,
                           'modalidade', OLD.modalidade, 'local', OLD.local, 'observacoes', OLD.observacoes),
        jsonb_build_object('data_audiencia', NEW.data_audiencia, 'tipo', NEW.tipo,
                           'modalidade', NEW.modalidade, 'local', NEW.local, 'observacoes', NEW.observacoes));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_audiencia
  AFTER INSERT OR UPDATE ON public.audiencias
  FOR EACH ROW EXECUTE FUNCTION public.audit_audiencia_changes();

CREATE OR REPLACE FUNCTION public.audit_audiencia_responsavel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, para)
    VALUES (NEW.audiencia_id, NEW.tenant_id, auth.uid(),
      'responsavel_adicionado',
      jsonb_build_object('user_id', NEW.user_id, 'papel', NEW.papel));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, de)
    VALUES (OLD.audiencia_id, OLD.tenant_id, auth.uid(),
      'responsavel_removido',
      jsonb_build_object('user_id', OLD.user_id, 'papel', OLD.papel));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_aud_resp
  AFTER INSERT OR DELETE ON public.audiencia_responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.audit_audiencia_responsavel();

CREATE OR REPLACE FUNCTION public.audit_audiencia_comentario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audiencia_historico(audiencia_id, tenant_id, user_id, acao, para)
  VALUES (NEW.audiencia_id, NEW.tenant_id, NEW.user_id,
    'comentario',
    jsonb_build_object('preview', LEFT(NEW.comentario, 140)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_aud_coment
  AFTER INSERT ON public.audiencia_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.audit_audiencia_comentario();

-- 7) RPC de sync (UPSERT a partir de payload JSON) -------------------
CREATE OR REPLACE FUNCTION public.sync_audiencias_oab(
  p_tenant_id uuid,
  p_payload jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_user uuid := auth.uid();
BEGIN
  IF NOT public.user_belongs_to_tenant(p_tenant_id) THEN
    RAISE EXCEPTION 'not authorized for tenant %', p_tenant_id;
  END IF;

  INSERT INTO public.audiencias (
    tenant_id, processo_oab_id, andamento_origem_id,
    data_audiencia, hora_conhecida, tipo, modalidade, local,
    descricao_origem, criado_por
  )
  SELECT
    p_tenant_id,
    (item->>'processo_oab_id')::uuid,
    NULLIF(item->>'andamento_id','')::uuid,
    (item->>'data_audiencia')::timestamptz,
    COALESCE((item->>'hora_conhecida')::boolean, false),
    COALESCE(item->>'tipo','Outras'),
    NULLIF(item->>'modalidade',''),
    NULLIF(item->>'local',''),
    NULLIF(item->>'descricao_original',''),
    v_user
  FROM jsonb_array_elements(p_payload) AS item
  ON CONFLICT (processo_oab_id, data_audiencia) DO UPDATE
    SET andamento_origem_id = COALESCE(EXCLUDED.andamento_origem_id, public.audiencias.andamento_origem_id),
        tipo = CASE WHEN public.audiencias.tipo = 'Outras' THEN EXCLUDED.tipo ELSE public.audiencias.tipo END,
        modalidade = COALESCE(EXCLUDED.modalidade, public.audiencias.modalidade),
        local = COALESCE(EXCLUDED.local, public.audiencias.local),
        descricao_origem = COALESCE(EXCLUDED.descricao_origem, public.audiencias.descricao_origem);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_audiencias_oab(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.sync_audiencias_oab(uuid, jsonb) TO authenticated;
