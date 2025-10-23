-- Create link_collections table
CREATE TABLE public.link_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.link_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.link_collections ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own collections
CREATE POLICY "Users can manage their own collections"
  ON public.link_collections
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.link_profiles WHERE user_id = auth.uid()
    )
  );

-- Add collection_id to link_items
ALTER TABLE public.link_items 
  ADD COLUMN collection_id UUID REFERENCES public.link_collections(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_link_items_collection_id ON public.link_items(collection_id);
CREATE INDEX idx_link_collections_profile_id ON public.link_collections(profile_id);