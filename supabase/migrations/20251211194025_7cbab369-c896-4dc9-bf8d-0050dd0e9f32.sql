-- Add tracking columns to cnpjs_cadastrados for Push-Docs monitoring
ALTER TABLE cnpjs_cadastrados 
ADD COLUMN IF NOT EXISTS tracking_id text,
ADD COLUMN IF NOT EXISTS monitoramento_ativo boolean DEFAULT false;