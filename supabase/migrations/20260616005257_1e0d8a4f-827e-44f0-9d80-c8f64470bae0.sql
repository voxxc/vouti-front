CREATE TABLE IF NOT EXISTS public.spn_practice_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.spn_book_units(id) ON DELETE CASCADE,
  kind text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spn_practice_questions TO authenticated, anon;
GRANT ALL ON public.spn_practice_questions TO service_role;
ALTER TABLE public.spn_practice_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authenticated can read practice questions"
  ON public.spn_practice_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage practice questions"
  ON public.spn_practice_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.spn_user_roles WHERE user_id=auth.uid() AND role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.spn_user_roles WHERE user_id=auth.uid() AND role='admin'));

CREATE TABLE IF NOT EXISTS public.spn_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL,
  unit_id uuid,
  difficulty text NOT NULL,
  total int NOT NULL,
  correct int NOT NULL,
  xp_earned int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.spn_practice_sessions TO authenticated;
GRANT ALL ON public.spn_practice_sessions TO service_role;
ALTER TABLE public.spn_practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own sessions"
  ON public.spn_practice_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own sessions"
  ON public.spn_practice_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read all sessions"
  ON public.spn_practice_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.spn_user_roles WHERE user_id=auth.uid() AND role='admin'));