
-- Add optional taxonomy columns for visual word bank
ALTER TABLE public.spn_word_bank_items
  ADD COLUMN IF NOT EXISTS focus_word text,
  ADD COLUMN IF NOT EXISTS full_highlight boolean NOT NULL DEFAULT false;

-- Attempts table for Word Bank "Caderno" practice mode
CREATE TABLE IF NOT EXISTS public.spn_word_bank_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.spn_word_bank_items(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL,
  answer text,
  is_correct boolean NOT NULL DEFAULT false,
  viewed_answer boolean NOT NULL DEFAULT false,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.spn_word_bank_attempts TO authenticated;
GRANT ALL ON public.spn_word_bank_attempts TO service_role;

ALTER TABLE public.spn_word_bank_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wb_attempts_select_own"
  ON public.spn_word_bank_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wb_attempts_insert_own"
  ON public.spn_word_bank_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wb_attempts_user_item
  ON public.spn_word_bank_attempts(user_id, item_id);

-- XP trigger: award +5 XP only on first correct attempt per item.
CREATE OR REPLACE FUNCTION public.spn_wb_award_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
  v_existing int;
BEGIN
  IF NEW.is_correct IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  v_reason := 'word_bank:' || NEW.item_id::text;

  SELECT count(*) INTO v_existing
    FROM public.spn_points
    WHERE user_id = NEW.user_id AND reason = v_reason;

  IF v_existing = 0 THEN
    INSERT INTO public.spn_points (user_id, points, reason)
    VALUES (NEW.user_id, 5, v_reason);
    NEW.xp_awarded := 5;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spn_wb_award_xp ON public.spn_word_bank_attempts;
CREATE TRIGGER trg_spn_wb_award_xp
  BEFORE INSERT ON public.spn_word_bank_attempts
  FOR EACH ROW EXECUTE FUNCTION public.spn_wb_award_xp();
