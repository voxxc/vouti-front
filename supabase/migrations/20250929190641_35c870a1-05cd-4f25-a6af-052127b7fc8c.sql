-- Criar tabela para processos da controladoria
CREATE TABLE public.controladoria_processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_processo TEXT NOT NULL UNIQUE,
  cliente TEXT NOT NULL,
  tribunal TEXT NOT NULL,
  assunto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('ativo', 'aguardando', 'arquivado', 'vencido'))
);

-- Enable Row Level Security
ALTER TABLE public.controladoria_processos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own controladoria processes" 
ON public.controladoria_processos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own controladoria processes" 
ON public.controladoria_processos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own controladoria processes" 
ON public.controladoria_processos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own controladoria processes" 
ON public.controladoria_processos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_controladoria_processos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_controladoria_processos_updated_at
BEFORE UPDATE ON public.controladoria_processos
FOR EACH ROW
EXECUTE FUNCTION public.update_controladoria_processos_updated_at();

-- Create index for better performance
CREATE INDEX idx_controladoria_processos_user_id ON public.controladoria_processos(user_id);
CREATE INDEX idx_controladoria_processos_status ON public.controladoria_processos(status);
CREATE INDEX idx_controladoria_processos_numero ON public.controladoria_processos(numero_processo);