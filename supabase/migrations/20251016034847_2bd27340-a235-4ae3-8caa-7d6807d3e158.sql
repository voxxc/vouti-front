-- FASE 1: Adicionar campos de texto livre para Tribunal, Comarca e Tipo de Ação
ALTER TABLE processos 
ADD COLUMN IF NOT EXISTS tribunal_nome TEXT,
ADD COLUMN IF NOT EXISTS comarca_nome TEXT,
ADD COLUMN IF NOT EXISTS tipo_acao_nome TEXT;

-- FASE 2: Adicionar role 'controller' ao enum app_role
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid  
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'controller') THEN
    ALTER TYPE app_role ADD VALUE 'controller';
  END IF;
END $$;