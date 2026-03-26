CREATE TABLE public.link_text_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.link_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT 'Texto',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  font_size INTEGER NOT NULL DEFAULT 16,
  color TEXT NOT NULL DEFAULT '#000000',
  font_weight TEXT NOT NULL DEFAULT 'normal',
  font_style TEXT NOT NULL DEFAULT 'normal',
  position_x NUMERIC NOT NULL DEFAULT 50,
  position_y NUMERIC NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.link_text_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own text elements"
  ON public.link_text_elements
  FOR ALL
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.link_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.link_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active text elements"
  ON public.link_text_elements
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Super admins can manage all text elements"
  ON public.link_text_elements
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_link_text_elements_updated_at
  BEFORE UPDATE ON public.link_text_elements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_link_profiles_updated_at();