
CREATE TABLE public.wow_quiz_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  indicado_por text,
  respostas jsonb NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.wow_quiz_respostas TO anon, authenticated;
GRANT SELECT, DELETE ON public.wow_quiz_respostas TO authenticated;
GRANT ALL ON public.wow_quiz_respostas TO service_role;

ALTER TABLE public.wow_quiz_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit wow quiz"
  ON public.wow_quiz_respostas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can view wow quiz responses"
  ON public.wow_quiz_respostas
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete wow quiz responses"
  ON public.wow_quiz_respostas
  FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX idx_wow_quiz_respostas_created_at ON public.wow_quiz_respostas (created_at DESC);
