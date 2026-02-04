-- Atualizar função para registrar desativação de monitoramento
CREATE OR REPLACE FUNCTION public.registrar_banco_id_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: registrar ID do processo
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'processo',
      NEW.id,
      NEW.id::text,
      COALESCE(NEW.numero_cnj, 'Processo sem CNJ'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj, 'tribunal', NEW.tribunal)
    );
  END IF;
  
  -- UPDATE: registrar tracking_id se ativou monitoramento
  IF TG_OP = 'UPDATE' AND NEW.tracking_id IS DISTINCT FROM OLD.tracking_id AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking',
      NEW.id,
      NEW.tracking_id,
      'Monitoramento: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj, 'monitoramento_ativo', NEW.monitoramento_ativo)
    );
  END IF;
  
  -- NOVO: registrar quando monitoramento foi DESATIVADO
  IF TG_OP = 'UPDATE' 
     AND OLD.monitoramento_ativo = TRUE 
     AND NEW.monitoramento_ativo = FALSE 
     AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking_desativado',
      NEW.id,
      NEW.tracking_id,
      'Desativado: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object(
        'numero_cnj', NEW.numero_cnj, 
        'tracking_id', NEW.tracking_id,
        'desativado_em', NOW()
      )
    );
  END IF;
  
  -- UPDATE: registrar detalhes_request_id se buscou detalhes
  IF TG_OP = 'UPDATE' AND NEW.detalhes_request_id IS DISTINCT FROM OLD.detalhes_request_id AND NEW.detalhes_request_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'request_detalhes',
      NEW.id,
      NEW.detalhes_request_id,
      'Detalhes: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Migrar monitoramentos já desativados (retroativo)
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'tracking_desativado',
  id,
  tracking_id,
  'Desativado: ' || COALESCE(numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', numero_cnj, 'tracking_id', tracking_id, 'retroativo', true),
  updated_at
FROM processos_oab 
WHERE tenant_id IS NOT NULL 
  AND tracking_id IS NOT NULL 
  AND monitoramento_ativo = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids tbi 
    WHERE tbi.referencia_id = processos_oab.id 
      AND tbi.tipo = 'tracking_desativado'
  );