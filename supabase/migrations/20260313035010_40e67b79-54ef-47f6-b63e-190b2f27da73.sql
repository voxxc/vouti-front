
-- Function to auto-classify deadline category based on title keywords
CREATE OR REPLACE FUNCTION public.classify_deadline_category(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN LOWER(p_title) LIKE '%exceção de pré-executividade%' 
      OR LOWER(p_title) LIKE '%excecao de pre-executividade%'
      OR LOWER(p_title) LIKE '%exceção de pré executividade%'
      OR LOWER(p_title) LIKE '%exceção de pre-executividade%'
      THEN 'Exceção de Pré-executividade'
    WHEN LOWER(p_title) LIKE '%impugnação ao laudo%' 
      OR LOWER(p_title) LIKE '%impugnacao ao laudo%'
      THEN 'Impugnação ao laudo pericial'
    WHEN LOWER(p_title) LIKE '%laudo complementar%'
      THEN 'Laudo complementar'
    WHEN LOWER(p_title) LIKE '%cumprimento de sentença%' 
      OR LOWER(p_title) LIKE '%cumprimento de sentenca%'
      THEN 'Cumprimento de Sentença'
    WHEN LOWER(p_title) LIKE '%liquidação de sentença%' 
      OR LOWER(p_title) LIKE '%liquidacao de sentenca%'
      OR LOWER(p_title) LIKE '%liquidação%' 
      OR LOWER(p_title) LIKE '%liquidacao%'
      THEN 'Liquidação de sentença'
    WHEN LOWER(p_title) LIKE '%revisional%' 
      OR LOWER(p_title) LIKE '%revisão%' 
      OR LOWER(p_title) LIKE '%revisao%'
      THEN 'Revisional'
    WHEN LOWER(p_title) LIKE '%embargos%'
      THEN 'Embargos'
    WHEN LOWER(p_title) LIKE '%contestação%' 
      OR LOWER(p_title) LIKE '%contestacao%'
      THEN 'Contestação'
    WHEN LOWER(p_title) LIKE '%elaboração de quesitos%' 
      OR LOWER(p_title) LIKE '%elaboracao de quesitos%' 
      OR LOWER(p_title) LIKE '%quesitos%'
      THEN 'Elaboração de quesitos'
    WHEN LOWER(p_title) LIKE '%laudo%' 
      OR LOWER(p_title) LIKE '%pericial%'
      THEN 'Outros'
    ELSE NULL
  END;
$$;

-- Trigger function to auto-set deadline_category on insert/update
CREATE OR REPLACE FUNCTION public.auto_classify_deadline_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_category text;
BEGIN
  -- Only auto-classify if category is NULL
  IF NEW.deadline_category IS NULL AND NEW.title IS NOT NULL THEN
    v_category := classify_deadline_category(NEW.title);
    IF v_category IS NOT NULL THEN
      NEW.deadline_category := v_category;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_classify_deadline_category ON public.deadlines;
CREATE TRIGGER trg_auto_classify_deadline_category
  BEFORE INSERT OR UPDATE OF title ON public.deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_classify_deadline_category();
