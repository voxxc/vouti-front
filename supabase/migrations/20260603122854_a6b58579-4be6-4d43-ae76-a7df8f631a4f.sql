-- Vincular anexos órfãos do processo 5000609-66.2025.8.13.0685 à movimentação mais recente
WITH known_steps AS (
  SELECT DISTINCT lower(dados_completos->>'step_id') AS sid
  FROM processos_oab_andamentos
  WHERE processo_oab_id = '2ac98654-2690-4008-ba52-07bd072fafa1'
    AND dados_completos->>'step_id' IS NOT NULL
)
UPDATE processos_oab_anexos
SET step_id = '0333386a'
WHERE processo_oab_id = '2ac98654-2690-4008-ba52-07bd072fafa1'
  AND (step_id IS NULL OR lower(step_id) NOT IN (SELECT sid FROM known_steps));