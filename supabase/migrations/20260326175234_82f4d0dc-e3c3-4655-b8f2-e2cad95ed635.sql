ALTER TABLE public.link_profiles
  ADD COLUMN IF NOT EXISTS content_vertical_position text NOT NULL DEFAULT 'top';