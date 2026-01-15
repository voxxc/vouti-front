-- Adicionar coluna CNH (opcional) na tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnh TEXT;