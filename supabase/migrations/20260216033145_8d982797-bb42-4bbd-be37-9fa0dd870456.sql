
-- ================================================================
-- FIX 1: Set search_path on all public functions missing it
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_cnpjs_cadastrados_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_oabs_cadastradas_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_processo_monitoramento_judit_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_processos_cnpj_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_processos_oab_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_project_columns_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_reuniao_status_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.create_default_acordos_sector()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO project_sectors (project_id, name, description, sector_order, is_default, created_by)
  VALUES (NEW.id, 'Acordos', 'Setor para gerenciar acordos e processos', 999, true, NEW.created_by);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_project_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.project_columns (project_id, name, column_order, color, is_default) VALUES
    (NEW.id, 'Em Espera', 0, '#eab308', true),
    (NEW.id, 'A Fazer', 1, '#3b82f6', true),
    (NEW.id, 'Andamento', 2, '#f97316', true),
    (NEW.id, 'Concluído', 3, '#22c55e', true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_credential(encrypted_text text, key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_credential(text_to_encrypt text, key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  RETURN encode(pgp_sym_encrypt(text_to_encrypt, key), 'base64');
END;
$function$;

CREATE OR REPLACE FUNCTION public.processo_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO processo_historico (processo_id, acao, user_id)
    VALUES (NEW.id, 'Processo criado', NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO processo_historico (processo_id, acao, campo_alterado, valor_anterior, valor_novo, user_id)
    VALUES (NEW.id, 'Processo atualizado', NULL, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_descricao(txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $function$ SELECT LEFT(LOWER(TRIM(COALESCE(txt, ''))), 100) $function$;

CREATE OR REPLACE FUNCTION public.truncate_minute(ts timestamp with time zone)
RETURNS timestamp with time zone LANGUAGE sql IMMUTABLE SET search_path = public
AS $function$ SELECT date_trunc('minute', ts AT TIME ZONE 'UTC') $function$;

-- ================================================================
-- FIX 2: Replace overly permissive RLS policies
-- ================================================================

-- project_workspaces
DROP POLICY IF EXISTS "Users can insert workspaces" ON project_workspaces;
CREATE POLICY "Users can insert workspaces" ON project_workspaces
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND is_project_member(project_id));

DROP POLICY IF EXISTS "Users can update workspaces" ON project_workspaces;
CREATE POLICY "Users can update workspaces" ON project_workspaces
  FOR UPDATE USING (tenant_id = get_user_tenant_id() AND is_project_member(project_id));

DROP POLICY IF EXISTS "Users can delete workspaces" ON project_workspaces;
CREATE POLICY "Users can delete workspaces" ON project_workspaces
  FOR DELETE USING (tenant_id = get_user_tenant_id() AND is_project_member(project_id));

-- metal_setor_flow
DROP POLICY IF EXISTS "Operators can update their sector flows" ON metal_setor_flow;
CREATE POLICY "Operators can insert sector flows" ON metal_setor_flow
  FOR INSERT WITH CHECK (has_metal_role(auth.uid(), 'operador') OR has_metal_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Operators can update flows" ON metal_setor_flow;
CREATE POLICY "Operators can update flows" ON metal_setor_flow
  FOR UPDATE USING (has_metal_role(auth.uid(), 'operador') OR has_metal_role(auth.uid(), 'admin'));

-- metal_ops: add proper WITH CHECK
DROP POLICY IF EXISTS "Operators can update ops in their sector" ON metal_ops;
CREATE POLICY "Operators can update ops in their sector" ON metal_ops
  FOR UPDATE USING (
    (setor_atual = (SELECT setor FROM metal_profiles WHERE user_id = auth.uid()))
    OR (setor_atual IS NULL AND EXISTS (
      SELECT 1 FROM metal_profiles WHERE user_id = auth.uid() AND setor = 'Programação'
    ))
  ) WITH CHECK (
    (setor_atual = (SELECT setor FROM metal_profiles WHERE user_id = auth.uid()))
    OR (setor_atual IS NULL AND EXISTS (
      SELECT 1 FROM metal_profiles WHERE user_id = auth.uid() AND setor = 'Programação'
    ))
  );

-- batink_audit_logs
DROP POLICY IF EXISTS "System can create audit logs" ON batink_audit_logs;
CREATE POLICY "System can create audit logs" ON batink_audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- judit_api_logs
DROP POLICY IF EXISTS "System can insert judit logs" ON judit_api_logs;
CREATE POLICY "System can insert judit logs" ON judit_api_logs
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "System can update judit logs" ON judit_api_logs;
CREATE POLICY "System can update judit logs" ON judit_api_logs
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- oab_request_historico
DROP POLICY IF EXISTS "Sistema pode inserir historico" ON oab_request_historico;
CREATE POLICY "Sistema pode inserir historico" ON oab_request_historico
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Sistema pode atualizar historico" ON oab_request_historico;
CREATE POLICY "Sistema pode atualizar historico" ON oab_request_historico
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- processo_andamentos_judit
DROP POLICY IF EXISTS "System can insert andamentos" ON processo_andamentos_judit;
CREATE POLICY "System can insert andamentos" ON processo_andamentos_judit
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- processo_historico
DROP POLICY IF EXISTS "System can create historico" ON processo_historico;
CREATE POLICY "System can create historico" ON processo_historico
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- processo_monitoramento_judit
DROP POLICY IF EXISTS "System can insert monitoramento" ON processo_monitoramento_judit;
CREATE POLICY "System can insert monitoramento" ON processo_monitoramento_judit
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- task_history
DROP POLICY IF EXISTS "System can create history entries" ON task_history;
CREATE POLICY "System can create history entries" ON task_history
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- tipos_acao
DROP POLICY IF EXISTS "Authenticated users can create tipos_acao" ON tipos_acao;
CREATE POLICY "Authenticated users can create tipos_acao" ON tipos_acao
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- tribunal_sync_logs
DROP POLICY IF EXISTS "System can insert sync logs" ON tribunal_sync_logs;
CREATE POLICY "System can insert sync logs" ON tribunal_sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- whatsapp_messages: tenant-scoped
DROP POLICY IF EXISTS "System can insert whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "service_insert" ON whatsapp_messages;
CREATE POLICY "Tenant users can insert whatsapp messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- metal_op_history
DROP POLICY IF EXISTS "System can create history" ON metal_op_history;
CREATE POLICY "System can create history" ON metal_op_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- landing_leads: keep open for unauthenticated form submissions (intentional)
-- No change needed - already addressed in scan
