
UPDATE deadlines 
SET concluido_em = updated_at 
WHERE completed = true 
AND concluido_por IS NOT NULL 
AND concluido_em IS NULL;
