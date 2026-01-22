-- Trigger para bloquear DELETE em processos_oab quando monitoramento_ativo = true
CREATE OR REPLACE FUNCTION prevent_delete_monitored_processo_oab()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.monitoramento_ativo = TRUE THEN
    RAISE EXCEPTION 'Não é possível excluir processos com monitoramento ativo. Desative o monitoramento primeiro.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS check_monitoramento_before_delete_oab ON processos_oab;
CREATE TRIGGER check_monitoramento_before_delete_oab
BEFORE DELETE ON processos_oab
FOR EACH ROW
EXECUTE FUNCTION prevent_delete_monitored_processo_oab();

-- Trigger para bloquear DELETE em processos quando monitoramento_ativo = true
CREATE OR REPLACE FUNCTION prevent_delete_monitored_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.monitoramento_ativo = TRUE THEN
    RAISE EXCEPTION 'Não é possível excluir processos com monitoramento ativo. Desative o monitoramento primeiro.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS check_monitoramento_before_delete ON processos;
CREATE TRIGGER check_monitoramento_before_delete
BEFORE DELETE ON processos
FOR EACH ROW
EXECUTE FUNCTION prevent_delete_monitored_processo();