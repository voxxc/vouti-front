-- 1. Create batink_entry_type enum if not exists
DO $$ 
BEGIN
  CREATE TYPE batink_entry_type_v2 AS ENUM ('entrada', 'pausa', 'almoco', 'retorno_almoco', 'saida');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns to batink_time_entries
ALTER TABLE batink_time_entries 
ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS entry_time TIME DEFAULT CURRENT_TIME;

-- Migrate existing data from registered_at to entry_date and entry_time
UPDATE batink_time_entries 
SET entry_date = DATE(registered_at),
    entry_time = registered_at::TIME
WHERE entry_date IS NULL OR entry_time IS NULL;

-- 3. Update batink_profiles table - rename full_name to nome_completo
ALTER TABLE batink_profiles 
RENAME COLUMN full_name TO nome_completo;

-- Add apelido column
ALTER TABLE batink_profiles 
ADD COLUMN IF NOT EXISTS apelido TEXT;

-- 4. Create batink_audit_logs table
CREATE TABLE IF NOT EXISTS batink_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE batink_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON batink_audit_logs FOR SELECT
USING (has_batink_role(auth.uid(), 'admin'::batink_role));

CREATE POLICY "System can create audit logs"
ON batink_audit_logs FOR INSERT
WITH CHECK (true);