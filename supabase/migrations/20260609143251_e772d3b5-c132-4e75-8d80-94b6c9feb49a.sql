
-- 1) Easy to Understand: itens (frases-modelo) por Unit
CREATE TABLE public.spn_easy_to_understand_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.spn_book_units(id) ON DELETE CASCADE,
  pair_index integer NOT NULL DEFAULT 0,
  side text NOT NULL CHECK (side IN ('left','right')),
  prompt_html text NOT NULL,
  placeholder text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spn_easy_to_understand_items TO authenticated;
GRANT ALL ON public.spn_easy_to_understand_items TO service_role;
ALTER TABLE public.spn_easy_to_understand_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read easy items"
  ON public.spn_easy_to_understand_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert easy items"
  ON public.spn_easy_to_understand_items FOR INSERT TO authenticated
  WITH CHECK (public.has_spn_role(auth.uid(), 'admin'::spn_role));
CREATE POLICY "Admins update easy items"
  ON public.spn_easy_to_understand_items FOR UPDATE TO authenticated
  USING (public.has_spn_role(auth.uid(), 'admin'::spn_role));
CREATE POLICY "Admins delete easy items"
  ON public.spn_easy_to_understand_items FOR DELETE TO authenticated
  USING (public.has_spn_role(auth.uid(), 'admin'::spn_role));

-- 2) Easy to Understand: respostas do aluno
CREATE TABLE public.spn_easy_to_understand_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.spn_easy_to_understand_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spn_easy_to_understand_answers TO authenticated;
GRANT ALL ON public.spn_easy_to_understand_answers TO service_role;
ALTER TABLE public.spn_easy_to_understand_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own easy answers"
  ON public.spn_easy_to_understand_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own easy answers"
  ON public.spn_easy_to_understand_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own easy answers"
  ON public.spn_easy_to_understand_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own easy answers"
  ON public.spn_easy_to_understand_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3) Exercises: itens por Unit
CREATE TABLE public.spn_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.spn_book_units(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'fill_blank' CHECK (kind IN ('fill_blank','short_answer','translate')),
  prompt_html text NOT NULL,
  correct_answer text,
  hint text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spn_exercises TO authenticated;
GRANT ALL ON public.spn_exercises TO service_role;
ALTER TABLE public.spn_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read exercises"
  ON public.spn_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert exercises"
  ON public.spn_exercises FOR INSERT TO authenticated
  WITH CHECK (public.has_spn_role(auth.uid(), 'admin'::spn_role));
CREATE POLICY "Admins update exercises"
  ON public.spn_exercises FOR UPDATE TO authenticated
  USING (public.has_spn_role(auth.uid(), 'admin'::spn_role));
CREATE POLICY "Admins delete exercises"
  ON public.spn_exercises FOR DELETE TO authenticated
  USING (public.has_spn_role(auth.uid(), 'admin'::spn_role));

-- 4) Exercises: respostas do aluno
CREATE TABLE public.spn_exercise_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.spn_exercises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer text NOT NULL DEFAULT '',
  is_correct boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spn_exercise_answers TO authenticated;
GRANT ALL ON public.spn_exercise_answers TO service_role;
ALTER TABLE public.spn_exercise_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own exercise answers"
  ON public.spn_exercise_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own exercise answers"
  ON public.spn_exercise_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own exercise answers"
  ON public.spn_exercise_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own exercise answers"
  ON public.spn_exercise_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
