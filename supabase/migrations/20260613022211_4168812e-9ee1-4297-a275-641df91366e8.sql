
CREATE OR REPLACE FUNCTION public.get_english_lp_leads()
RETURNS TABLE (
  id uuid,
  nome text,
  telefone text,
  status text,
  notas text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, telefone, status, notas, created_at
  FROM public.landing_leads
  WHERE origem = 'lp-ingles'
  ORDER BY created_at DESC
  LIMIT 1000;
$$;

GRANT EXECUTE ON FUNCTION public.get_english_lp_leads() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_english_lp_lead_status(_id uuid, _status text, _notas text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.landing_leads
  SET status = _status,
      notas = COALESCE(_notas, notas),
      updated_at = now()
  WHERE id = _id AND origem = 'lp-ingles';
$$;

GRANT EXECUTE ON FUNCTION public.update_english_lp_lead_status(uuid, text, text) TO anon, authenticated;
