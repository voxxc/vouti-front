-- Permitir NULL na coluna task_id para que ON DELETE SET NULL funcione
ALTER TABLE task_history 
ALTER COLUMN task_id DROP NOT NULL;