ALTER TABLE public.link_profiles
  ADD COLUMN IF NOT EXISTS bg_color_1 text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS bg_color_2 text,
  ADD COLUMN IF NOT EXISTS bg_gradient_direction text NOT NULL DEFAULT 'to-b',
  ADD COLUMN IF NOT EXISTS button_color text NOT NULL DEFAULT '#1e293b',
  ADD COLUMN IF NOT EXISTS button_text_color text NOT NULL DEFAULT '#ffffff';