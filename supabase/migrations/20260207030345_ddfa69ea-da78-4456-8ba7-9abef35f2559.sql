-- 1. Atualizar constraint para incluir 'request_tracking'
ALTER TABLE tenant_banco_ids DROP CONSTRAINT IF EXISTS tenant_banco_ids_tipo_check;
ALTER TABLE tenant_banco_ids ADD CONSTRAINT tenant_banco_ids_tipo_check 
  CHECK (tipo IN (
    'oab', 
    'processo', 
    'tracking', 
    'tracking_desativado', 
    'request_busca', 
    'request_detalhes', 
    'request_tracking',
    'push_doc', 
    'tracking_push_doc'
  ));

-- 2. Atualizar trigger para capturar tracking_request_id
CREATE OR REPLACE FUNCTION public.registrar_banco_id_processo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    -- Registrar detalhes_request_id se já veio preenchido no INSERT
    IF NEW.detalhes_request_id IS NOT NULL THEN
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
    
    -- Registrar tracking_id se já veio preenchido no INSERT
    IF NEW.tracking_id IS NOT NULL THEN
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
    
    -- NOVO: Registrar tracking_request_id se já veio preenchido no INSERT
    IF NEW.tracking_request_id IS NOT NULL THEN
      INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
      VALUES (
        NEW.tenant_id,
        'request_tracking',
        NEW.id,
        NEW.tracking_request_id,
        'Request Tracking: ' || COALESCE(NEW.numero_cnj, 'Processo'),
        jsonb_build_object(
          'numero_cnj', NEW.numero_cnj, 
          'tracking_id', NEW.tracking_id,
          'data_request', NEW.tracking_request_data
        )
      );
    END IF;
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
  
  -- Registrar quando monitoramento foi DESATIVADO
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
  
  -- NOVO: UPDATE: registrar tracking_request_id quando muda
  IF TG_OP = 'UPDATE' 
     AND NEW.tracking_request_id IS DISTINCT FROM OLD.tracking_request_id 
     AND NEW.tracking_request_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'request_tracking',
      NEW.id,
      NEW.tracking_request_id,
      'Request Tracking: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object(
        'numero_cnj', NEW.numero_cnj, 
        'tracking_id', NEW.tracking_id,
        'data_request', NEW.tracking_request_data
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Migrar dados existentes (processos que já têm tracking_request_id)
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  po.tenant_id,
  'request_tracking',
  po.id,
  po.tracking_request_id,
  'Request Tracking: ' || COALESCE(po.numero_cnj, 'Processo'),
  jsonb_build_object(
    'numero_cnj', po.numero_cnj, 
    'tracking_id', po.tracking_id,
    'data_request', po.tracking_request_data
  )
FROM processos_oab po
WHERE po.tracking_request_id IS NOT NULL
  AND po.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids tbi 
    WHERE tbi.external_id = po.tracking_request_id 
      AND tbi.tipo = 'request_tracking'
  );