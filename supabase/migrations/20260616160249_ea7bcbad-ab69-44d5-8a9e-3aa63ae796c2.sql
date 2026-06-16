
-- 1) Word Bank: categoria + verbo destaque
ALTER TABLE public.spn_word_bank_items
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS is_featured_verb boolean NOT NULL DEFAULT false;

ALTER TABLE public.spn_word_bank_items
  DROP CONSTRAINT IF EXISTS spn_word_bank_items_category_check;
ALTER TABLE public.spn_word_bank_items
  ADD CONSTRAINT spn_word_bank_items_category_check
  CHECK (category IN ('verb','question_word','phrasal_verb','expression','noun','adjective','adverb','other'));

CREATE OR REPLACE FUNCTION public.spn_check_featured_verbs_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.is_featured_verb = true THEN
    SELECT COUNT(*) INTO v_count
    FROM public.spn_word_bank_items
    WHERE unit_id = NEW.unit_id
      AND is_featured_verb = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF v_count >= 2 THEN
      RAISE EXCEPTION 'Limite de 2 verbos destaque por unit já atingido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spn_featured_verbs_limit ON public.spn_word_bank_items;
CREATE TRIGGER trg_spn_featured_verbs_limit
BEFORE INSERT OR UPDATE ON public.spn_word_bank_items
FOR EACH ROW EXECUTE FUNCTION public.spn_check_featured_verbs_limit();

-- 2) Straight to the Point: formato chat
ALTER TABLE public.spn_straight_to_point
  ADD COLUMN IF NOT EXISTS chat_title text,
  ADD COLUMN IF NOT EXISTS chat_situation text,
  ADD COLUMN IF NOT EXISTS chat_messages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_words jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fill_in_practice jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.spn_straight_to_point
  DROP CONSTRAINT IF EXISTS spn_straight_to_point_block_type_check;
ALTER TABLE public.spn_straight_to_point
  ADD CONSTRAINT spn_straight_to_point_block_type_check
  CHECK (block_type IN ('html','dialogue','chat_dialogue','legacy_html','rule_dialogue'));

-- 3) Exercícios: gabarito + explicação + dica
ALTER TABLE public.spn_exercises
  ADD COLUMN IF NOT EXISTS correct_answer jsonb,
  ADD COLUMN IF NOT EXISTS explanation_pt text,
  ADD COLUMN IF NOT EXISTS learning_tip_pt text;

-- 4) Respostas de exercícios: vi resposta + flag acerto
ALTER TABLE public.spn_exercise_answers
  ADD COLUMN IF NOT EXISTS viewed_answer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_correct boolean;
