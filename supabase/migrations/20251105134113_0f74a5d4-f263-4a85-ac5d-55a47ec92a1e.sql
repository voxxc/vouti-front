-- Tabela para clientes de reunião (separada da tabela de clientes financeiros)
CREATE TABLE IF NOT EXISTS public.reuniao_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_reuniao_clientes_nome ON public.reuniao_clientes USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_reuniao_clientes_telefone ON public.reuniao_clientes(telefone);
CREATE INDEX idx_reuniao_clientes_user_id ON public.reuniao_clientes(user_id);

-- Adicionar campo cliente_id na tabela reunioes
ALTER TABLE public.reunioes 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.reuniao_clientes(id) ON DELETE SET NULL;

CREATE INDEX idx_reunioes_cliente_id ON public.reunioes(cliente_id);

-- RLS Policies
ALTER TABLE public.reuniao_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reuniao clientes"
  ON public.reuniao_clientes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own reuniao clientes"
  ON public.reuniao_clientes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own reuniao clientes"
  ON public.reuniao_clientes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Users can update their own reuniao clientes"
  ON public.reuniao_clientes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users with agenda role can view reuniao clientes"
  ON public.reuniao_clientes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'agenda'
    )
  );

CREATE POLICY "Users with agenda role can create reuniao clientes"
  ON public.reuniao_clientes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'agenda'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_reuniao_clientes_updated_at
  BEFORE UPDATE ON public.reuniao_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();