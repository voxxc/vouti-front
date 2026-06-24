
CREATE TABLE public.super_admin_feature_flags (
  flag_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.super_admin_feature_flags TO authenticated;
GRANT ALL ON public.super_admin_feature_flags TO service_role;

ALTER TABLE public.super_admin_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_all_authenticated"
  ON public.super_admin_feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "feature_flags_insert_super_admin"
  ON public.super_admin_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "feature_flags_update_super_admin"
  ON public.super_admin_feature_flags FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "feature_flags_delete_super_admin"
  ON public.super_admin_feature_flags FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

INSERT INTO public.super_admin_feature_flags (flag_key, enabled, description)
VALUES ('escavador_monitoramento_enabled', false, 'Habilita ativação de monitoramento de processos via Escavador para os tenants.')
ON CONFLICT (flag_key) DO NOTHING;
