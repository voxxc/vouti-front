
-- Backfill: classify all existing deadlines that still have NULL deadline_category
UPDATE public.deadlines
SET deadline_category = classify_deadline_category(title)
WHERE deadline_category IS NULL
  AND classify_deadline_category(title) IS NOT NULL;
