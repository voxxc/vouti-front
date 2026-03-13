-- Auto-classify existing deadlines based on title keywords
-- Only for users with 'perito' role

UPDATE public.deadlines
SET deadline_category = CASE
  WHEN LOWER(title) LIKE '%exceção de pré-executividade%' OR LOWER(title) LIKE '%excecao de pre-executividade%' OR LOWER(title) LIKE '%exceção de pré executividade%' THEN 'Exceção de Pré-executividade'
  WHEN LOWER(title) LIKE '%impugnação ao laudo%' OR LOWER(title) LIKE '%impugnacao ao laudo%' THEN 'Impugnação ao laudo pericial'
  WHEN LOWER(title) LIKE '%laudo complementar%' THEN 'Laudo complementar'
  WHEN LOWER(title) LIKE '%laudo revisional%' OR LOWER(title) LIKE '%revisional%' OR LOWER(title) LIKE '%revisão%' OR LOWER(title) LIKE '%revisao%' THEN 'Revisional'
  WHEN LOWER(title) LIKE '%embargos%' THEN 'Embargos'
  WHEN LOWER(title) LIKE '%contestação%' OR LOWER(title) LIKE '%contestacao%' THEN 'Contestação'
  WHEN LOWER(title) LIKE '%elaboração de quesitos%' OR LOWER(title) LIKE '%elaboracao de quesitos%' OR LOWER(title) LIKE '%quesitos%' THEN 'Elaboração de quesitos'
  WHEN LOWER(title) LIKE '%liquidação de sentença%' OR LOWER(title) LIKE '%liquidacao de sentenca%' OR LOWER(title) LIKE '%liquidação%' OR LOWER(title) LIKE '%liquidacao%' THEN 'Liquidação de sentença'
  WHEN LOWER(title) LIKE '%cumprimento de sentença%' OR LOWER(title) LIKE '%cumprimento de sentenca%' OR LOWER(title) LIKE '%cumprimento%' THEN 'Cumprimento de Sentença'
  ELSE 'Outros'
END
WHERE deadline_category IS NULL
  AND user_id IN (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'perito'
  );