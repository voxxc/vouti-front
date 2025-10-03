-- Create comments table for leads
CREATE TABLE public.lead_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads_captacao(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view comments on their leads"
  ON public.lead_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads_captacao lc
      WHERE lc.id = lead_id AND lc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on their leads"
  ON public.lead_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.leads_captacao lc
      WHERE lc.id = lead_id AND lc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.lead_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.lead_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lead_comments_updated_at
  BEFORE UPDATE ON public.lead_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for comment attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-attachments', 'lead-attachments', false);

-- Create storage policies
CREATE POLICY "Users can view attachments on their leads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lead-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );