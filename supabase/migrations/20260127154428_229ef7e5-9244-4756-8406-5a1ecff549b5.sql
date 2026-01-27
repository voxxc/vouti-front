-- Atualizar CHECK constraint para incluir 'parcial'
ALTER TABLE cliente_parcelas 
DROP CONSTRAINT IF EXISTS cliente_parcelas_status_check;

ALTER TABLE cliente_parcelas 
ADD CONSTRAINT cliente_parcelas_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text, 'parcial'::text]));