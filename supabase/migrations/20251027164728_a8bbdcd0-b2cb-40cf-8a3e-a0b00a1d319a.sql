-- Criar tabela para dívidas adicionais dos clientes
CREATE TABLE IF NOT EXISTS public.cliente_dividas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_total NUMERIC NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  valor_parcela NUMERIC NOT NULL,
  data_inicio DATE NOT NULL,
  data_vencimento_final DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar campo divida_id em cliente_parcelas para vincular parcelas a dívidas específicas
ALTER TABLE public.cliente_parcelas 
ADD COLUMN IF NOT EXISTS divida_id UUID REFERENCES public.cliente_dividas(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.cliente_dividas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para cliente_dividas
CREATE POLICY "Users can view dividas of their clients" 
ON public.cliente_dividas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_dividas.cliente_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all dividas" 
ON public.cliente_dividas FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create dividas for their clients" 
ON public.cliente_dividas FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_dividas.cliente_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update dividas of their clients" 
ON public.cliente_dividas FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_dividas.cliente_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete dividas of their clients" 
ON public.cliente_dividas FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c 
    WHERE c.id = cliente_dividas.cliente_id 
    AND c.user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_cliente_dividas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cliente_dividas_updated_at
BEFORE UPDATE ON public.cliente_dividas
FOR EACH ROW
EXECUTE FUNCTION public.update_cliente_dividas_updated_at();