
-- Remover política SELECT antiga que anula a restrição de segurança
DROP POLICY IF EXISTS "Clientes podem ver próprias credenciais" ON public.credenciais_cliente;

-- Garantir backfill completo de created_by
UPDATE public.credenciais_cliente
SET created_by = enviado_por
WHERE created_by IS NULL AND enviado_por IS NOT NULL;
