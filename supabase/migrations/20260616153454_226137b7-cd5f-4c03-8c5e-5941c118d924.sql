
-- ============ 1) Word Bank: book_id + dedupe + unique index ============

ALTER TABLE public.spn_word_bank_items
  ADD COLUMN IF NOT EXISTS book_id uuid;

-- Backfill book_id from unit -> book
UPDATE public.spn_word_bank_items wbi
SET book_id = u.book_id
FROM public.spn_book_units u
WHERE wbi.unit_id = u.id AND wbi.book_id IS NULL;

-- Trigger to keep book_id in sync on insert/update
CREATE OR REPLACE FUNCTION public.spn_word_bank_set_book_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT book_id INTO NEW.book_id FROM public.spn_book_units WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spn_word_bank_set_book_id ON public.spn_word_bank_items;
CREATE TRIGGER trg_spn_word_bank_set_book_id
  BEFORE INSERT OR UPDATE OF unit_id ON public.spn_word_bank_items
  FOR EACH ROW EXECUTE FUNCTION public.spn_word_bank_set_book_id();

-- Dedupe: keep the oldest per (book_id, lower(word))
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY book_id, lower(trim(word))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.spn_word_bank_items
  WHERE book_id IS NOT NULL
)
DELETE FROM public.spn_word_bank_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Unique index per book
CREATE UNIQUE INDEX IF NOT EXISTS spn_word_bank_unique_word_per_book
  ON public.spn_word_bank_items (book_id, lower(trim(word)));

-- ============ 2) Straight to the Point: conversational fields ============

ALTER TABLE public.spn_straight_to_point
  ADD COLUMN IF NOT EXISTS block_type text NOT NULL DEFAULT 'legacy_html',
  ADD COLUMN IF NOT EXISTS rule_title text,
  ADD COLUMN IF NOT EXISTS rule_explanation text,
  ADD COLUMN IF NOT EXISTS question_text text,
  ADD COLUMN IF NOT EXISTS answer_negative text,
  ADD COLUMN IF NOT EXISTS answer_positive text,
  ADD COLUMN IF NOT EXISTS examples jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.spn_straight_to_point
  DROP CONSTRAINT IF EXISTS spn_straight_to_point_block_type_check;
ALTER TABLE public.spn_straight_to_point
  ADD CONSTRAINT spn_straight_to_point_block_type_check
  CHECK (block_type IN ('legacy_html', 'rule_dialogue'));
