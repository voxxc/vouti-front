-- Create metal_ops table for Production Orders
CREATE TABLE IF NOT EXISTS public.metal_ops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_op TEXT NOT NULL UNIQUE,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  produto TEXT NOT NULL,
  dimensoes TEXT,
  material TEXT,
  acabamento TEXT,
  cliente TEXT NOT NULL,
  pedido TEXT,
  item TEXT,
  quantidade INTEGER NOT NULL,
  desenhista TEXT,
  ficha_tecnica_url TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando',
  setor_atual TEXT,
  data_prevista_saida DATE,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metal_setor_flow table to track OP flow through sectors
CREATE TABLE IF NOT EXISTS public.metal_setor_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  op_id UUID NOT NULL REFERENCES public.metal_ops(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  entrada TIMESTAMP WITH TIME ZONE,
  saida TIMESTAMP WITH TIME ZONE,
  operador_entrada_id UUID,
  operador_saida_id UUID,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metal_op_history table for change tracking
CREATE TABLE IF NOT EXISTS public.metal_op_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  op_id UUID NOT NULL REFERENCES public.metal_ops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  acao TEXT NOT NULL,
  detalhes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metal_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metal_setor_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metal_op_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metal_ops
CREATE POLICY "Admins can manage all OPs" ON public.metal_ops
  FOR ALL USING (has_metal_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can view all OPs" ON public.metal_ops
  FOR SELECT USING (true);

-- RLS Policies for metal_setor_flow
CREATE POLICY "Admins can manage all sector flows" ON public.metal_setor_flow
  FOR ALL USING (has_metal_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can view all flows" ON public.metal_setor_flow
  FOR SELECT USING (true);

CREATE POLICY "Operators can update their sector flows" ON public.metal_setor_flow
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Operators can update flows" ON public.metal_setor_flow
  FOR UPDATE USING (true);

-- RLS Policies for metal_op_history
CREATE POLICY "Admins can view all history" ON public.metal_op_history
  FOR SELECT USING (has_metal_role(auth.uid(), 'admin'));

CREATE POLICY "System can create history" ON public.metal_op_history
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for technical sheets
INSERT INTO storage.buckets (id, name, public)
VALUES ('op-fichas-tecnicas', 'op-fichas-tecnicas', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for op-fichas-tecnicas
CREATE POLICY "Public can view technical sheets" ON storage.objects
  FOR SELECT USING (bucket_id = 'op-fichas-tecnicas');

CREATE POLICY "Authenticated users can upload technical sheets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'op-fichas-tecnicas' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete technical sheets" ON storage.objects
  FOR DELETE USING (bucket_id = 'op-fichas-tecnicas' AND has_metal_role(auth.uid(), 'admin'));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.metal_ops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metal_setor_flow;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metal_op_history;

-- Set replica identity for realtime
ALTER TABLE public.metal_ops REPLICA IDENTITY FULL;
ALTER TABLE public.metal_setor_flow REPLICA IDENTITY FULL;
ALTER TABLE public.metal_op_history REPLICA IDENTITY FULL;

-- Create trigger for updated_at
CREATE TRIGGER update_metal_ops_updated_at
  BEFORE UPDATE ON public.metal_ops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();