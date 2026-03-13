-- Auto-classify ALL existing deadlines based on title keywords (not just perito role)

UPDATE public.deadlines
SET deadline_category = CASE
  WHEN LOWER(title) LIKE '%exceção de pré-executividade%' OR LOWER(title) LIKE '%excecao de pre-executividade%' OR LOWER(title) LIKE '%exceção de pré executividade%' OR LOWER(title) LIKE '%exceção de pre-executividade%' THEN 'Exceção de Pré-executividade'
  WHEN LOWER(title) LIKE '%impugnação ao laudo%' OR LOWER(title) LIKE '%impugnacao ao laudo%' THEN 'Impugnação ao laudo pericial'
  WHEN LOWER(title) LIKE '%laudo complementar%' THEN 'Laudo complementar'
  WHEN LOWER(title) LIKE '%revisional%' OR LOWER(title) LIKE '%revisão%' OR LOWER(title) LIKE '%revisao%' OR LOWER(title) LIKE '%laudo de revisão%' OR LOWER(title) LIKE '%laudo de revisao%' THEN 'Revisional'
  WHEN LOWER(title) LIKE '%embargos%' THEN 'Embargos'
  WHEN LOWER(title) LIKE '%contestação%' OR LOWER(title) LIKE '%contestacao%' THEN 'Contestação'
  WHEN LOWER(title) LIKE '%quesitos%' THEN 'Elaboração de quesitos'
  WHEN LOWER(title) LIKE '%liquidação%' OR LOWER(title) LIKE '%liquidacao%' THEN 'Liquidação de sentença'
  WHEN LOWER(title) LIKE '%cumprimento de sentença%' OR LOWER(title) LIKE '%cumprimento de sentenca%' THEN 'Cumprimento de Sentença'
  WHEN LOWER(title) LIKE '%laudo%' OR LOWER(title) LIKE '%pericial%' THEN 'Outros'
  ELSE NULL
END
WHERE deadline_category IS NULL OR deadline_category = 'Outros';