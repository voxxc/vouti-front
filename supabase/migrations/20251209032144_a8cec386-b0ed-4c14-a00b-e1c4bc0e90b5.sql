-- Remove duplicate andamentos, keeping only the oldest record for each unique combination
DELETE FROM processos_oab_andamentos a
USING processos_oab_andamentos b
WHERE a.id > b.id
  AND a.processo_oab_id = b.processo_oab_id
  AND a.data_movimentacao IS NOT DISTINCT FROM b.data_movimentacao
  AND a.descricao = b.descricao;