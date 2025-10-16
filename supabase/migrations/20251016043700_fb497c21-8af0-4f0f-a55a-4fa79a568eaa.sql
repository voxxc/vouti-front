-- Corrigir JSONB nos logs de auditoria de conferência
CREATE OR REPLACE FUNCTION public.registrar_conferencia_audit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.conferido = TRUE THEN
    INSERT INTO processo_historico (
      processo_id,
      acao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      user_id
    )
    SELECT 
      pm.processo_id,
      'Andamento conferido',
      'status_conferencia',
      to_jsonb('pendente'::text),
      to_jsonb('conferido'::text),
      NEW.conferido_por
    FROM processo_movimentacoes pm
    WHERE pm.id = NEW.movimentacao_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_conferencia_audit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.conferido IS DISTINCT FROM NEW.conferido AND NEW.conferido = TRUE THEN
    INSERT INTO processo_historico (
      processo_id,
      acao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      user_id
    )
    SELECT 
      pm.processo_id,
      'Andamento conferido',
      'status_conferencia',
      to_jsonb('pendente'::text),
      to_jsonb('conferido'::text),
      NEW.conferido_por
    FROM processo_movimentacoes pm
    WHERE pm.id = NEW.movimentacao_id;
  END IF;
  RETURN NEW;
END;
$function$;