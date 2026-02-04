-- 1. Criar tabela tenant_banco_ids
CREATE TABLE public.tenant_banco_ids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('oab', 'processo', 'tracking', 'request_busca', 'request_detalhes', 'request_monitoramento')),
  referencia_id uuid,
  external_id text,
  descricao text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tenant_banco_ids_tenant_id ON public.tenant_banco_ids(tenant_id);
CREATE INDEX idx_tenant_banco_ids_tipo ON public.tenant_banco_ids(tipo);
CREATE INDEX idx_tenant_banco_ids_external_id ON public.tenant_banco_ids(external_id);

-- RLS
ALTER TABLE public.tenant_banco_ids ENABLE ROW LEVEL SECURITY;

-- Política para super admins
CREATE POLICY "Super admins podem ver todos os IDs" ON public.tenant_banco_ids
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem inserir IDs" ON public.tenant_banco_ids
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR tenant_id = get_user_tenant_id());

-- 2. Função para registrar IDs de OABs
CREATE OR REPLACE FUNCTION public.registrar_banco_id_oab()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INSERT: registrar ID da OAB
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'oab',
      NEW.id,
      NEW.id::text,
      'OAB ' || NEW.oab_numero || '/' || NEW.oab_uf || COALESCE(' - ' || NEW.nome_advogado, ''),
      jsonb_build_object('oab_numero', NEW.oab_numero, 'oab_uf', NEW.oab_uf, 'nome_advogado', NEW.nome_advogado)
    );
  END IF;
  
  -- UPDATE: registrar novo request_id de busca se mudou
  IF TG_OP = 'UPDATE' AND NEW.ultimo_request_id IS DISTINCT FROM OLD.ultimo_request_id AND NEW.ultimo_request_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'request_busca',
      NEW.id,
      NEW.ultimo_request_id,
      'Busca OAB ' || NEW.oab_numero || '/' || NEW.oab_uf,
      jsonb_build_object('oab_numero', NEW.oab_numero, 'oab_uf', NEW.oab_uf, 'data_request', NEW.request_id_data)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Função para registrar IDs de Processos
CREATE OR REPLACE FUNCTION public.registrar_banco_id_processo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. Criar triggers
CREATE TRIGGER trigger_registrar_banco_id_oab
  AFTER INSERT OR UPDATE ON public.oabs_cadastradas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_banco_id_oab();

CREATE TRIGGER trigger_registrar_banco_id_processo
  AFTER INSERT OR UPDATE ON public.processos_oab
  FOR EACH ROW
  EXECUTE FUNCTION registrar_banco_id_processo();

-- 5. Migrar dados existentes - OABs
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'oab',
  id,
  id::text,
  'OAB ' || oab_numero || '/' || oab_uf || COALESCE(' - ' || nome_advogado, ''),
  jsonb_build_object('oab_numero', oab_numero, 'oab_uf', oab_uf, 'nome_advogado', nome_advogado),
  created_at
FROM oabs_cadastradas 
WHERE tenant_id IS NOT NULL;

-- 6. Migrar request_ids de busca OAB existentes
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'request_busca',
  id,
  ultimo_request_id,
  'Busca OAB ' || oab_numero || '/' || oab_uf,
  jsonb_build_object('oab_numero', oab_numero, 'oab_uf', oab_uf, 'data_request', request_id_data),
  COALESCE(request_id_data::timestamptz, created_at)
FROM oabs_cadastradas 
WHERE tenant_id IS NOT NULL AND ultimo_request_id IS NOT NULL;

-- 7. Migrar processos existentes
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'processo',
  id,
  id::text,
  COALESCE(numero_cnj, 'Processo sem CNJ'),
  jsonb_build_object('numero_cnj', numero_cnj, 'tribunal', tribunal),
  created_at
FROM processos_oab 
WHERE tenant_id IS NOT NULL;

-- 8. Migrar tracking_ids existentes
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'tracking',
  id,
  tracking_id,
  'Monitoramento: ' || COALESCE(numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', numero_cnj, 'monitoramento_ativo', monitoramento_ativo),
  updated_at
FROM processos_oab 
WHERE tenant_id IS NOT NULL AND tracking_id IS NOT NULL;

-- 9. Migrar detalhes_request_ids existentes
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'request_detalhes',
  id,
  detalhes_request_id,
  'Detalhes: ' || COALESCE(numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', numero_cnj),
  updated_at
FROM processos_oab 
WHERE tenant_id IS NOT NULL AND detalhes_request_id IS NOT NULL;