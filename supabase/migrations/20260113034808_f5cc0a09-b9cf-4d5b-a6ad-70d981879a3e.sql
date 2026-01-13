-- Add secret column to credenciais_cliente table
ALTER TABLE credenciais_cliente 
ADD COLUMN secret TEXT;