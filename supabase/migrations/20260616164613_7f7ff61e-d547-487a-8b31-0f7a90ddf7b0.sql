ALTER TABLE public.spn_straight_to_point DROP CONSTRAINT IF EXISTS spn_straight_to_point_block_type_check;
ALTER TABLE public.spn_straight_to_point ADD CONSTRAINT spn_straight_to_point_block_type_check
  CHECK (block_type = ANY (ARRAY['html'::text,'dialogue'::text,'chat_dialogue'::text,'legacy_html'::text,'rule_dialogue'::text,'notebook_page'::text]));