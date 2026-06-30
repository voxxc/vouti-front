ALTER TABLE public.spn_exercises DROP CONSTRAINT IF EXISTS spn_exercises_kind_check;
ALTER TABLE public.spn_exercises ADD CONSTRAINT spn_exercises_kind_check CHECK (kind = ANY (ARRAY['fill_blank'::text, 'short_answer'::text, 'translate'::text, 'multiple_choice'::text, 'listen_type'::text]));
ALTER TABLE public.spn_exercises ADD COLUMN IF NOT EXISTS options jsonb;
ALTER TABLE public.spn_exercises ADD COLUMN IF NOT EXISTS audio_text text;