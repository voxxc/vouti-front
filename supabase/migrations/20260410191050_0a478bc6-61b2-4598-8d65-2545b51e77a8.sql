
-- Categorias reutilizáveis
CREATE TABLE public.votech_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  icone TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.votech_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categorias" ON public.votech_categorias
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transações (receitas e despesas)
CREATE TABLE public.votech_transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria_id UUID REFERENCES public.votech_categorias(id) ON DELETE SET NULL,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente')),
  observacoes TEXT,
  recorrente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.votech_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transacoes" ON public.votech_transacoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_votech_transacoes_updated_at
  BEFORE UPDATE ON public.votech_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contas a pagar/receber
CREATE TABLE public.votech_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  categoria_id UUID REFERENCES public.votech_categorias(id) ON DELETE SET NULL,
  fornecedor_cliente TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.votech_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contas" ON public.votech_contas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_votech_contas_updated_at
  BEFORE UPDATE ON public.votech_contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar categorias padrão
CREATE OR REPLACE FUNCTION public.criar_votech_categorias_padrao(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.votech_categorias (user_id, tipo, nome, cor, icone) VALUES
    (p_user_id, 'receita', 'Salário', '#22c55e', 'banknote'),
    (p_user_id, 'receita', 'Freelance', '#3b82f6', 'laptop'),
    (p_user_id, 'receita', 'Investimentos', '#8b5cf6', 'trending-up'),
    (p_user_id, 'receita', 'Outros', '#6b7280', 'plus'),
    (p_user_id, 'despesa', 'Alimentação', '#f97316', 'utensils'),
    (p_user_id, 'despesa', 'Transporte', '#eab308', 'car'),
    (p_user_id, 'despesa', 'Moradia', '#ef4444', 'home'),
    (p_user_id, 'despesa', 'Saúde', '#ec4899', 'heart'),
    (p_user_id, 'despesa', 'Educação', '#14b8a6', 'graduation-cap'),
    (p_user_id, 'despesa', 'Lazer', '#a855f7', 'gamepad'),
    (p_user_id, 'despesa', 'Outros', '#6b7280', 'tag')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Indexes
CREATE INDEX idx_votech_transacoes_user_tipo ON public.votech_transacoes(user_id, tipo);
CREATE INDEX idx_votech_transacoes_data ON public.votech_transacoes(data);
CREATE INDEX idx_votech_contas_user_tipo ON public.votech_contas(user_id, tipo);
CREATE INDEX idx_votech_contas_vencimento ON public.votech_contas(data_vencimento);
CREATE INDEX idx_votech_contas_status ON public.votech_contas(status);
