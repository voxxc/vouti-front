-- Alterar constraint de CASCADE para SET NULL
-- Isso preservará os registros de histórico quando tasks forem deletadas

ALTER TABLE task_history 
DROP CONSTRAINT IF EXISTS task_history_task_id_fkey;

ALTER TABLE task_history 
ADD CONSTRAINT task_history_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;