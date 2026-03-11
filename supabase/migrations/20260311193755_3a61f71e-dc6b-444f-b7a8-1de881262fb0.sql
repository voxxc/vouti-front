-- Mark "CONFECÇÃO DE LAUDO PARA EMBARGOS À MONITÓRIA" as completed by Wesley
UPDATE public.deadlines 
SET completed = true, 
    concluido_por = '51d47f3b-fbe6-4811-9817-a45040c1bdee',
    concluido_em = NOW(),
    updated_at = NOW()
WHERE id = '92f1b231-4dac-452c-bbfb-874dc8b85d6f'
  AND completed = false;