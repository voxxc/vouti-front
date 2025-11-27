-- Create batink_time_entries table for time clock records
CREATE TABLE public.batink_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('entrada', 'saida')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batink_time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own entries
CREATE POLICY "Users can view own time entries"
ON public.batink_time_entries
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can insert own time entries"
ON public.batink_time_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all entries (for admin panel)
CREATE POLICY "Admins can view all time entries"
ON public.batink_time_entries
FOR SELECT
USING (public.has_batink_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_batink_time_entries_user_id ON public.batink_time_entries(user_id);
CREATE INDEX idx_batink_time_entries_registered_at ON public.batink_time_entries(registered_at DESC);