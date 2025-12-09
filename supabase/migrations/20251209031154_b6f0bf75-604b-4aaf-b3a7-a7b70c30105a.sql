-- Corrigir datas dos andamentos existentes extraindo step_date do dados_completos
UPDATE processos_oab_andamentos 
SET data_movimentacao = (dados_completos->>'step_date')::timestamp
WHERE data_movimentacao IS NULL 
AND dados_completos->>'step_date' IS NOT NULL;