ALTER TABLE link_profiles
  ADD COLUMN IF NOT EXISTS sub_button_style text NOT NULL DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS sub_button_radius text NOT NULL DEFAULT 'xl',
  ADD COLUMN IF NOT EXISTS sub_button_padding text NOT NULL DEFAULT 'compact',
  ADD COLUMN IF NOT EXISTS sub_button_color text,
  ADD COLUMN IF NOT EXISTS sub_button_text_color text;