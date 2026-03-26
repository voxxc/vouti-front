ALTER TABLE link_profiles
  ADD COLUMN IF NOT EXISTS button_style text NOT NULL DEFAULT 'filled',
  ADD COLUMN IF NOT EXISTS button_radius text NOT NULL DEFAULT 'xl',
  ADD COLUMN IF NOT EXISTS button_padding text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS button_spacing text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS button_border_color text;

ALTER TABLE link_items
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES link_items(id) ON DELETE CASCADE;