
-- Re-add public SELECT policy for link_profiles (was dropped previously)
CREATE POLICY "Anon can view link profiles"
  ON link_profiles FOR SELECT
  TO anon
  USING (true);

-- Ensure anon can view active link_items
-- The existing "Public can view active links" policy may only apply to authenticated
-- Let's add explicit anon policy
CREATE POLICY "Anon can view active links"
  ON link_items FOR SELECT
  TO anon
  USING (is_active = true);

-- Create RPC to increment clicks (anon-safe, no direct UPDATE needed)
CREATE OR REPLACE FUNCTION public.increment_link_clicks(p_link_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE link_items
  SET clicks = clicks + 1
  WHERE id = p_link_id AND is_active = true;
END;
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION public.increment_link_clicks(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_link_clicks(UUID) TO authenticated;

-- Also allow anon to view active link_collections
CREATE POLICY "Anon can view active collections"
  ON link_collections FOR SELECT
  TO anon
  USING (is_active = true);
