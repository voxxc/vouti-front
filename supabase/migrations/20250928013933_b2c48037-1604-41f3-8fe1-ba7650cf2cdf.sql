-- Create deadlines table
CREATE TABLE public.deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  project_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own deadlines" 
ON public.deadlines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deadlines" 
ON public.deadlines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deadlines" 
ON public.deadlines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deadlines" 
ON public.deadlines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deadlines_updated_at
BEFORE UPDATE ON public.deadlines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();