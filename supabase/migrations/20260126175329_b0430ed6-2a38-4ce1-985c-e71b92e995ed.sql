-- Adicionar coluna saldo_restante para rastrear pagamentos parciais
ALTER TABLE cliente_parcelas 
ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC DEFAULT 0;