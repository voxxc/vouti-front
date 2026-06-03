UPDATE processos_oab_anexos
SET step_id = lower(step_id)
WHERE processo_oab_id = '2ac98654-2690-4008-ba52-07bd072fafa1'
  AND step_id IS NOT NULL
  AND step_id <> lower(step_id);